/**
 * Hash Generation Utilities
 * 
 * SHA-256 hash generation with streaming support for large files
 */

import { createHash, Hash } from 'crypto'
import { readFile, createReadStream } from 'fs'
import { Readable } from 'stream'
import { promisify } from 'util'

const readFileAsync = promisify(readFile)

/**
 * Generate SHA-256 hash from buffer
 * 
 * @param buffer - File buffer
 * @returns SHA-256 hash (hex string)
 */
export function generateSha256Hash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

/**
 * Generate SHA-256 hash from file path (for small files)
 * 
 * @param filePath - Path to file
 * @returns SHA-256 hash (hex string)
 */
export async function generateSha256HashFromFile(filePath: string): Promise<string> {
  const buffer = await readFileAsync(filePath)
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
 * Generate SHA-256 hash with chunk processing (for very large files)
 * Memory-efficient streaming hash calculation
 * 
 * @param filePath - Path to file
 * @param chunkSize - Chunk size in bytes (default: 1MB)
 * @param onProgress - Optional progress callback
 * @returns SHA-256 hash (hex string)
 */
export async function generateSha256HashWithChunks(
  filePath: string,
  chunkSize: number = 1024 * 1024, // 1MB default
  onProgress?: (bytesProcessed: number, totalBytes: number) => void
): Promise<string> {
  const hash: Hash = createHash('sha256')
  const stream = createReadStream(filePath, { highWaterMark: chunkSize })

  // Get file size for progress tracking
  const { stat } = await import('fs/promises')
  const stats = await stat(filePath)
  const totalBytes = stats.size
  let bytesProcessed = 0

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => {
      hash.update(chunk)
      bytesProcessed += chunk.length
      onProgress?.(bytesProcessed, totalBytes)
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
 * Generate SHA-256 hash from File object (browser/FormData)
 * Uses streaming for large files to handle memory efficiently
 * 
 * @param file - File object
 * @param onProgress - Optional progress callback
 * @returns SHA-256 hash (hex string)
 */
export async function generateSha256HashFromFileObject(
  file: File,
  onProgress?: (bytesProcessed: number, totalBytes: number) => void
): Promise<string> {
  const hash: Hash = createHash('sha256')
  const chunkSize = 1024 * 1024 // 1MB chunks
  const totalBytes = file.size
  let bytesProcessed = 0

  // For small files, read all at once
  if (totalBytes < chunkSize) {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    return generateSha256Hash(buffer)
  }

  // For large files, process in chunks
  let offset = 0

  while (offset < totalBytes) {
    const chunk = file.slice(offset, offset + chunkSize)
    const arrayBuffer = await chunk.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    hash.update(buffer)
    bytesProcessed += buffer.length
    onProgress?.(bytesProcessed, totalBytes)

    offset += chunkSize
  }

  return hash.digest('hex')
}

/**
 * Generate SHA-256 hash from ArrayBuffer
 * 
 * @param arrayBuffer - ArrayBuffer to hash
 * @returns SHA-256 hash (hex string)
 */
export function generateSha256HashFromArrayBuffer(arrayBuffer: ArrayBuffer): string {
  const buffer = Buffer.from(arrayBuffer)
  return generateSha256Hash(buffer)
}

/**
 * Verify hash format (64 character hexadecimal string)
 * 
 * @param hash - Hash string to verify
 * @returns True if hash format is valid
 */
export function isValidSha256Hash(hash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(hash)
}

/**
 * Compare two hashes (case-insensitive)
 * 
 * @param hash1 - First hash
 * @param hash2 - Second hash
 * @returns True if hashes match
 */
export function compareHashes(hash1: string, hash2: string): boolean {
  return hash1.toLowerCase() === hash2.toLowerCase()
}
