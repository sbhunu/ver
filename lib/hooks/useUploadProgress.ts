/**
 * Upload Progress Hook
 * 
 * React hook for tracking file upload progress with multipart support
 */

'use client'

import { useState, useCallback, useRef } from 'react'
import type { UploadState, UploadProgress, CancellationToken } from '@/lib/utils/multipart-upload'
import {
  calculateChunks,
  splitFileIntoChunks,
  uploadChunk,
  MULTIPART_THRESHOLD,
  CHUNK_SIZE,
} from '@/lib/utils/multipart-upload'
import { createClient } from '@/lib/supabase/client'

/**
 * Upload progress hook return type
 */
export interface UseUploadProgressReturn {
  progress: UploadProgress
  upload: (file: File, path: string, bucket?: string) => Promise<void>
  cancel: () => void
  reset: () => void
}

/**
 * Hook for tracking upload progress
 */
export function useUploadProgress(): UseUploadProgressReturn {
  const [progress, setProgress] = useState<UploadProgress>({
    state: 'idle',
    progress: 0,
    bytesUploaded: 0,
    totalBytes: 0,
    currentChunk: 0,
    totalChunks: 0,
  })

  const cancellationTokenRef = useRef<UploadCancellationToken | null>(null)

  const upload = useCallback(
    async (file: File, path: string, bucket: string = 'documents') => {
      // Create new cancellation token
      class CancellationTokenImpl {
        private cancelled = false
        private listeners: Array<() => void> = []

        cancel() {
          this.cancelled = true
          this.listeners.forEach((listener) => listener())
        }

        isCancelled() {
          return this.cancelled
        }

        onCancel(listener: () => void) {
          this.listeners.push(listener)
        }
      }

      const cancellationToken = new CancellationTokenImpl()

      cancellationTokenRef.current = cancellationToken

      const totalBytes = file.size
      let bytesUploaded = 0

      try {
        setProgress({
          state: 'uploading',
          progress: 0,
          bytesUploaded: 0,
          totalBytes,
          currentChunk: 0,
          totalChunks: 1,
        })

        // For files smaller than threshold, use direct upload
        if (totalBytes < MULTIPART_THRESHOLD) {
          const supabase = createClient()
          const fileBuffer = await file.arrayBuffer()

          if (cancellationToken.isCancelled()) {
            setProgress((prev) => ({ ...prev, state: 'cancelled' }))
            return
          }

          const { error } = await supabase.storage.from(bucket).upload(path, fileBuffer, {
            upsert: false,
          })

          if (error) {
            throw new Error(`Upload failed: ${error.message}`)
          }

          setProgress({
            state: 'success',
            progress: 100,
            bytesUploaded: totalBytes,
            totalBytes,
            currentChunk: 1,
            totalChunks: 1,
          })

          return
        }

        // For larger files, use multipart upload
        const chunks = await splitFileIntoChunks(file, CHUNK_SIZE)
        const totalChunks = chunks.length

        setProgress({
          state: 'uploading',
          progress: 0,
          bytesUploaded: 0,
          totalBytes,
          currentChunk: 0,
          totalChunks,
        })

        // Upload chunks sequentially
        for (let i = 0; i < chunks.length; i++) {
          if (cancellationToken.isCancelled()) {
            // Clean up uploaded chunks
            const supabase = createClient()
            for (let j = 0; j < i; j++) {
              await supabase.storage.from(bucket).remove([`${path}.part${j}`])
            }
            setProgress((prev) => ({ ...prev, state: 'cancelled' }))
            return
          }

          const chunk = chunks[i]
          const formData = new FormData()
          formData.append('chunk', chunk)
          formData.append('path', path)
          formData.append('chunkIndex', i.toString())
          formData.append('totalChunks', totalChunks.toString())
          formData.append('bucket', bucket)

          const response = await fetch('/api/upload/multipart', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to upload chunk')
          }

          bytesUploaded += chunk.size
          const progressPercent = Math.round((bytesUploaded / totalBytes) * 100)

          setProgress({
            state: 'uploading',
            progress: progressPercent,
            bytesUploaded,
            totalBytes,
            currentChunk: i + 1,
            totalChunks,
          })
        }

        // Combine chunks
        if (cancellationToken.isCancelled()) {
          setProgress((prev) => ({ ...prev, state: 'cancelled' }))
          return
        }

        const combineResponse = await fetch('/api/upload/multipart', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path,
            totalChunks,
            bucket,
          }),
        })

        if (!combineResponse.ok) {
          const error = await combineResponse.json()
          throw new Error(error.error || 'Failed to combine chunks')
        }

        setProgress({
          state: 'success',
          progress: 100,
          bytesUploaded: totalBytes,
          totalBytes,
          currentChunk: totalChunks,
          totalChunks,
        })
      } catch (error) {
        setProgress({
          state: 'error',
          progress: Math.round((bytesUploaded / totalBytes) * 100),
          bytesUploaded,
          totalBytes,
          currentChunk: progress.currentChunk,
          totalChunks: progress.totalChunks,
          error: error instanceof Error ? error.message : 'Upload failed',
        })
      } finally {
        cancellationTokenRef.current = null
      }
    },
    []
  )

  const cancel = useCallback(() => {
    if (cancellationTokenRef.current) {
      cancellationTokenRef.current.cancel()
    }
  }, [])

  const reset = useCallback(() => {
    setProgress({
      state: 'idle',
      progress: 0,
      bytesUploaded: 0,
      totalBytes: 0,
      currentChunk: 0,
      totalChunks: 0,
    })
    cancellationTokenRef.current = null
  }, [])

  return {
    progress,
    upload,
    cancel,
    reset,
  }
}
