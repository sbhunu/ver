/**
 * File Handling Utility Functions
 * 
 * Utilities for file operations, sanitization, validation, hashing,
 * and secure path generation.
 */

import { createHash, Hash, randomUUID } from 'crypto'
import { extname, basename, join, dirname } from 'path'
import { readFile, stat } from 'fs/promises'
import { createReadStream } from 'fs'
import { Readable } from 'stream'

// Import validation constants
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../validation'

// ============================================================================
// File Extension and MIME Type Utilities
// ============================================================================

/**
 * Allowed file extensions mapping to MIME types
 */
export const ALLOWED_EXTENSIONS = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
} as const

export type AllowedExtension = keyof typeof ALLOWED_EXTENSIONS

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return extname(filename).toLowerCase()
}

/**
 * Validate file extension
 */
export function isValidFileExtension(filename: string): boolean {
  const extension = getFileExtension(filename)
  return extension in ALLOWED_EXTENSIONS
}

/**
 * Get MIME type from file extension
 */
export function getMimeTypeFromExtension(filename: string): string | null {
  const extension = getFileExtension(filename)
  return ALLOWED_EXTENSIONS[extension as AllowedExtension] || null
}

/**
 * Detect MIME type from file extension
 * Returns MIME type if extension is valid, null otherwise
 */
export function detectMimeType(filename: string): string | null {
  return getMimeTypeFromExtension(filename)
}

/**
 * Validate MIME type against allowed types
 */
export function isValidMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType as typeof ALLOWED_MIME_TYPES[number])
}

// ============================================================================
// Filename Sanitization
// ============================================================================

/**
 * Sanitize filename by removing special characters and normalizing
 * 
 * @param filename - Original filename
 * @param maxLength - Maximum length (default: 255)
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string, maxLength: number = 255): string {
  if (!filename || typeof filename !== 'string') {
    throw new Error('Filename must be a non-empty string')
  }

  // Get base filename without path
  let sanitized = basename(filename)

  // Remove path separators and dangerous characters
  sanitized = sanitized.replace(/[\/\\?%*:|"<>]/g, '_')

  // Replace multiple spaces/underscores with single underscore
  sanitized = sanitized.replace(/[\s_]+/g, '_')

  // Remove leading/trailing underscores and dots
  sanitized = sanitized.replace(/^[._]+|[._]+$/g, '')

  // Preserve file extension
  const extension = getFileExtension(sanitized)
  const nameWithoutExt = sanitized.slice(0, sanitized.length - extension.length)

  // Truncate name if needed (preserve extension)
  const maxNameLength = maxLength - extension.length
  if (nameWithoutExt.length > maxNameLength) {
    sanitized = nameWithoutExt.slice(0, maxNameLength) + extension
  }

  // Ensure filename is not empty
  if (!sanitized || sanitized === extension) {
    sanitized = `file_${Date.now()}${extension}`
  }

  return sanitized
}

/**
 * Validate filename length
 */
export function validateFilenameLength(filename: string, maxLength: number = 255): boolean {
  return filename.length <= maxLength
}

// ============================================================================
// Secure File Path Generation
// ============================================================================

/**
 * Generate unique storage path with UUID prefix
 * 
 * @param basePath - Base storage directory
 * @param filename - Original filename (will be sanitized)
 * @param uuid - Optional UUID (generates new one if not provided)
 * @returns Secure storage path
 */
export function generateStoragePath(
  basePath: string,
  filename: string,
  uuid?: string
): string {
  const fileUuid = uuid || randomUUID()
  const sanitized = sanitizeFilename(filename)
  const extension = getFileExtension(sanitized)
  const nameWithoutExt = sanitized.slice(0, sanitized.length - extension.length)

  // Format: basePath/uuid/filename.ext
  // This prevents filename collisions and provides organization
  return join(basePath, fileUuid, `${nameWithoutExt}${extension}`)
}

/**
 * Generate storage path with date-based subdirectories
 * 
 * @param basePath - Base storage directory
 * @param filename - Original filename
 * @param uuid - Optional UUID
 * @returns Storage path with date subdirectories (YYYY/MM/DD/uuid/filename)
 */
export function generateDateBasedStoragePath(
  basePath: string,
  filename: string,
  uuid?: string
): string {
  const fileUuid = uuid || randomUUID()
  const sanitized = sanitizeFilename(filename)
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  // Format: basePath/YYYY/MM/DD/uuid/filename.ext
  return join(basePath, String(year), month, day, fileUuid, sanitized)
}

/**
 * Extract UUID from storage path
 */
export function extractUuidFromPath(storagePath: string): string | null {
  const parts = storagePath.split(/[\/\\]/)
  // UUID is typically in the path (32 hex chars with optional hyphens)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  for (const part of parts) {
    if (uuidPattern.test(part)) {
      return part
    }
  }
  return null
}

// ============================================================================
// SHA-256 Hash Generation
// ============================================================================

/**
 * Generate SHA-256 hash from buffer
 * 
 * @param buffer - File buffer
 * @returns SHA-256 hash (hex string)
 */
export async function generateSha256Hash(buffer: Buffer): Promise<string> {
  return createHash('sha256').update(buffer).digest('hex')
}

/**
 * Generate SHA-256 hash from file path (synchronous for small files)
 * 
 * @param filePath - Path to file
 * @returns SHA-256 hash (hex string)
 */
export async function generateSha256HashFromFile(filePath: string): Promise<string> {
  const buffer = await readFile(filePath)
  return generateSha256Hash(buffer)
}

/**
 * Generate SHA-256 hash from stream (for large files)
 * 
 * @param stream - Readable stream
 * @returns SHA-256 hash (hex string)
 */
export async function generateSha256HashFromStream(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash: Hash = createHash('sha256')
    let hashValue = ''

    stream.on('data', (chunk: Buffer) => {
      hash.update(chunk)
    })

    stream.on('end', () => {
      hashValue = hash.digest('hex')
      resolve(hashValue)
    })

    stream.on('error', (error: Error) => {
      reject(error)
    })
  })
}

/**
 * Generate SHA-256 hash with chunk processing (for very large files)
 * 
 * @param filePath - Path to file
 * @param chunkSize - Chunk size in bytes (default: 1MB)
 * @returns SHA-256 hash (hex string)
 */
export async function generateSha256HashWithChunks(
  filePath: string,
  chunkSize: number = 1024 * 1024
): Promise<string> {
  const hash: Hash = createHash('sha256')
  const stream = createReadStream(filePath, { highWaterMark: chunkSize })

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => {
      hash.update(chunk)
    })

    stream.on('end', () => {
      const hashValue = hash.digest('hex')
      resolve(hashValue)
    })

    stream.on('error', (error: Error) => {
      reject(error)
    })
  })
}

/**
 * Generate SHA-256 hash from FormData file
 * Uses streaming for large files to handle memory efficiently
 * 
 * @param file - File from FormData
 * @param onProgress - Optional progress callback
 * @returns SHA-256 hash (hex string)
 */
export async function generateSha256HashFromFormDataFile(
  file: File,
  onProgress?: (bytesProcessed: number, totalBytes: number) => void
): Promise<string> {
  const chunkSize = 1024 * 1024 // 1MB chunks
  const totalBytes = file.size

  // For small files, read all at once
  if (totalBytes < chunkSize) {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    return generateSha256Hash(buffer)
  }

  // For large files, process in chunks (streaming)
  const { createHash } = await import('crypto')
  const hash = createHash('sha256')
  let bytesProcessed = 0
  let offset = 0

  while (offset < totalBytes) {
    const chunk = file.slice(offset, Math.min(offset + chunkSize, totalBytes))
    const arrayBuffer = await chunk.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    hash.update(buffer)
    bytesProcessed += buffer.length
    onProgress?.(bytesProcessed, totalBytes)

    offset += chunkSize
  }

  return hash.digest('hex')
}

// ============================================================================
// File Validation Utilities
// ============================================================================

/**
 * Validate file size
 */
export function validateFileSize(size: number, maxSize: number = MAX_FILE_SIZE): boolean {
  return size > 0 && size <= maxSize
}

/**
 * Validate file (extension, size, MIME type)
 */
export interface FileValidationResult {
  valid: boolean
  errors: string[]
}

export function validateFile(
  filename: string,
  size: number,
  mimeType?: string
): FileValidationResult {
  const errors: string[] = []

  // Validate extension
  if (!isValidFileExtension(filename)) {
    errors.push(`Invalid file extension. Allowed: ${Object.keys(ALLOWED_EXTENSIONS).join(', ')}`)
  }

  // Validate size
  if (!validateFileSize(size)) {
    errors.push(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }

  // Validate MIME type if provided
  if (mimeType && !isValidMimeType(mimeType)) {
    errors.push(`Invalid MIME type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`)
  }

  // Validate MIME type matches extension if both provided
  if (mimeType && filename) {
    const expectedMimeType = getMimeTypeFromExtension(filename)
    if (expectedMimeType && expectedMimeType !== mimeType) {
      errors.push(`MIME type ${mimeType} does not match file extension`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// ============================================================================
// File Streaming Utilities
// ============================================================================

/**
 * Stream file in chunks
 * 
 * @param filePath - Path to file
 * @param chunkSize - Chunk size in bytes
 * @returns Async generator yielding chunks
 */
export async function* streamFileChunks(
  filePath: string,
  chunkSize: number = 1024 * 1024
): AsyncGenerator<Buffer, void, unknown> {
  const stream = createReadStream(filePath, { highWaterMark: chunkSize })

  for await (const chunk of stream) {
    yield chunk as Buffer
  }
}

/**
 * Process file in chunks with callback
 * 
 * @param filePath - Path to file
 * @param chunkSize - Chunk size in bytes
 * @param onChunk - Callback for each chunk
 * @returns Promise that resolves when processing is complete
 */
export async function processFileInChunks(
  filePath: string,
  chunkSize: number,
  onChunk: (chunk: Buffer, index: number) => Promise<void> | void
): Promise<void> {
  let index = 0
  for await (const chunk of streamFileChunks(filePath, chunkSize)) {
    await onChunk(chunk, index)
    index++
  }
}

/**
 * Get file size
 */
export async function getFileSize(filePath: string): Promise<number> {
  const stats = await stat(filePath)
  return stats.size
}

/**
 * Check if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath)
    return true
  } catch {
    return false
  }
}

// ============================================================================
// File Path Utilities
// ============================================================================

/**
 * Ensure directory exists (create if it doesn't)
 * Note: This is a utility function, actual directory creation should use fs.mkdir
 */
export function ensureDirectoryPath(filePath: string): string {
  return dirname(filePath)
}

/**
 * Get relative path from base directory
 */
export function getRelativePath(fullPath: string, basePath: string): string {
  if (!fullPath.startsWith(basePath)) {
    throw new Error('Path is not within base directory')
  }
  return fullPath.slice(basePath.length).replace(/^[\/\\]/, '')
}

/**
 * Normalize path separators (convert to forward slashes)
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/')
}

// ============================================================================
// File Metadata Utilities
// ============================================================================

/**
 * Get file metadata
 */
export interface FileMetadata {
  filename: string
  extension: string
  mimeType: string | null
  size: number
  sanitizedFilename: string
}

export async function getFileMetadata(
  file: File | { name: string; size: number; type?: string }
): Promise<FileMetadata> {
  const filename = file.name
  const extension = getFileExtension(filename)
  const mimeType = file.type || getMimeTypeFromExtension(filename)
  const sanitized = sanitizeFilename(filename)

  return {
    filename,
    extension,
    mimeType,
    size: file.size,
    sanitizedFilename: sanitized,
  }
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default chunk size for streaming (1MB)
 */
export const DEFAULT_CHUNK_SIZE = 1024 * 1024

/**
 * Maximum filename length
 */
export const MAX_FILENAME_LENGTH = 255

/**
 * Re-export validation constants for convenience
 */
export { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../validation'
