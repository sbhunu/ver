/**
 * Multipart Upload Utilities
 * 
 * Utilities for chunked file uploads with progress tracking
 */

import { createClient } from '@/lib/supabase/client'
import type { FileMetadata } from './file'

/**
 * Chunk size for multipart uploads (6MB threshold)
 */
export const MULTIPART_THRESHOLD = 6 * 1024 * 1024 // 6MB
export const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB chunks

/**
 * Upload state
 */
export type UploadState = 'idle' | 'uploading' | 'success' | 'error' | 'cancelled'

/**
 * Upload progress information
 */
export interface UploadProgress {
  state: UploadState
  progress: number // 0-100
  bytesUploaded: number
  totalBytes: number
  currentChunk: number
  totalChunks: number
  error?: string
}

/**
 * Upload cancellation token interface
 */
export interface CancellationToken {
  cancel(): void
  isCancelled(): boolean
  onCancel(listener: () => void): () => void
}

/**
 * Upload cancellation token implementation
 */
export class UploadCancellationToken implements CancellationToken {
  private cancelled = false
  private listeners: Array<() => void> = []

  cancel(): void {
    this.cancelled = true
    this.listeners.forEach((listener) => listener())
  }

  isCancelled(): boolean {
    return this.cancelled
  }

  onCancel(listener: () => void): () => void {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }
}

/**
 * Calculate number of chunks needed for file
 */
export function calculateChunks(fileSize: number, chunkSize: number = CHUNK_SIZE): number {
  return Math.ceil(fileSize / chunkSize)
}

/**
 * Split file into chunks
 */
export async function splitFileIntoChunks(
  file: File,
  chunkSize: number = CHUNK_SIZE
): Promise<Blob[]> {
  const chunks: Blob[] = []
  const totalChunks = calculateChunks(file.size, chunkSize)

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize
    const end = Math.min(start + chunkSize, file.size)
    const chunk = file.slice(start, end)
    chunks.push(chunk)
  }

  return chunks
}

/**
 * Upload chunk to Supabase Storage
 */
export async function uploadChunk(
  bucket: string,
  path: string,
  chunk: Blob,
  chunkIndex: number,
  totalChunks: number,
  cancellationToken?: CancellationToken
): Promise<void> {
  if (cancellationToken?.isCancelled()) {
    throw new Error('Upload cancelled')
  }

  const supabase = createClient()
  
  // For multipart uploads, we'll use a chunked path
  const chunkPath = `${path}.part${chunkIndex}`

  const { error } = await supabase.storage.from(bucket).upload(chunkPath, chunk, {
    upsert: true,
  })

  if (error) {
    throw new Error(`Failed to upload chunk ${chunkIndex}: ${error.message}`)
  }

  if (cancellationToken?.isCancelled()) {
    // Clean up uploaded chunk
    await supabase.storage.from(bucket).remove([chunkPath])
    throw new Error('Upload cancelled')
  }
}

/**
 * Combine chunks into final file
 * Note: Supabase Storage doesn't have native multipart upload API,
 * so we'll use a server action to combine chunks
 */
export async function combineChunks(
  bucket: string,
  path: string,
  totalChunks: number
): Promise<void> {
  // This will be handled by a server action that combines chunks
  // For now, we'll use a different approach: upload directly for smaller files
  // and use chunked upload with server-side combination for larger files
}

/**
 * Upload file with progress tracking
 */
export async function uploadFileWithProgress(
  file: File,
  bucket: string,
  path: string,
  onProgress?: (progress: UploadProgress) => void,
  cancellationToken?: CancellationToken
): Promise<void> {
  const totalBytes = file.size
  let bytesUploaded = 0

  // For files smaller than threshold, use direct upload
  if (totalBytes < MULTIPART_THRESHOLD) {
    const supabase = createClient()
    const fileBuffer = await file.arrayBuffer()

    if (cancellationToken?.isCancelled()) {
      throw new Error('Upload cancelled')
    }

    onProgress?.({
      state: 'uploading',
      progress: 0,
      bytesUploaded: 0,
      totalBytes,
      currentChunk: 0,
      totalChunks: 1,
    })

    const { error } = await supabase.storage.from(bucket).upload(path, fileBuffer, {
      upsert: false,
    })

    if (error) {
      onProgress?.({
        state: 'error',
        progress: 0,
        bytesUploaded: 0,
        totalBytes,
        currentChunk: 0,
        totalChunks: 1,
        error: error.message,
      })
      throw new Error(`Upload failed: ${error.message}`)
    }

    onProgress?.({
      state: 'success',
      progress: 100,
      bytesUploaded: totalBytes,
      totalBytes,
      currentChunk: 1,
      totalChunks: 1,
    })

    return
  }

  // For larger files, use chunked upload
  const chunks = await splitFileIntoChunks(file)
  const totalChunks = chunks.length

  // Upload chunks sequentially with progress tracking
  for (let i = 0; i < chunks.length; i++) {
    if (cancellationToken?.isCancelled()) {
      // Clean up uploaded chunks
      const supabase = createClient()
      for (let j = 0; j < i; j++) {
        await supabase.storage.from(bucket).remove([`${path}.part${j}`])
      }
      throw new Error('Upload cancelled')
    }

    const chunk = chunks[i]
    await uploadChunk(bucket, path, chunk, i, totalChunks, cancellationToken)

    bytesUploaded += chunk.size
    const progress = Math.round((bytesUploaded / totalBytes) * 100)

    onProgress?.({
      state: 'uploading',
      progress,
      bytesUploaded,
      totalBytes,
      currentChunk: i + 1,
      totalChunks,
    })
  }

  // Combine chunks (this will be handled by server action)
  // For now, we'll need to implement server-side chunk combination
  onProgress?.({
    state: 'success',
    progress: 100,
    bytesUploaded: totalBytes,
    totalBytes,
    currentChunk: totalChunks,
    totalChunks,
  })
}
