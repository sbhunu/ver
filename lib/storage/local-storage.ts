/**
 * Local File Storage for Demo
 *
 * Stores uploaded deed documents in storage_records/ folder (filesystem)
 * instead of Supabase Storage. Used when Supabase Storage has xattr issues
 * (e.g. Docker Desktop, WSL2). References use same path format as before:
 * property-{id}/documents/{uuid}-{filename}
 */

import { mkdir, writeFile, readFile, unlink } from 'fs/promises'
import { join } from 'path'
import { createReadStream, existsSync } from 'fs'

const STORAGE_RECORDS = 'storage_records'

/**
 * Base directory for local document storage (relative to project root)
 */
export function getStorageRecordsDir(): string {
  return join(process.cwd(), STORAGE_RECORDS)
}

/**
 * Full filesystem path for a storage_path reference
 * @param storagePath - e.g. property-xxx/documents/uuid-file.pdf
 */
export function getLocalFilePath(storagePath: string): string {
  return join(getStorageRecordsDir(), storagePath)
}

/**
 * Save file buffer to storage_records
 * @param storagePath - e.g. property-xxx/documents/uuid-file.pdf
 * @param buffer - File content
 */
export async function saveToLocalStorage(
  storagePath: string,
  buffer: ArrayBuffer
): Promise<void> {
  const fullPath = getLocalFilePath(storagePath)
  const dir = join(fullPath, '..')
  await mkdir(dir, { recursive: true })
  await writeFile(fullPath, Buffer.from(buffer), { flag: 'wx' })
}

/**
 * Check if file exists in storage_records
 */
export function existsInLocalStorage(storagePath: string): boolean {
  return existsSync(getLocalFilePath(storagePath))
}

/**
 * Read file from storage_records
 * @throws if file does not exist
 */
export async function readFromLocalStorage(storagePath: string): Promise<Buffer> {
  return readFile(getLocalFilePath(storagePath))
}

/**
 * Create readable stream for file in storage_records
 */
export function createReadStreamFromLocalStorage(storagePath: string) {
  return createReadStream(getLocalFilePath(storagePath))
}

/**
 * Remove file from storage_records (e.g. on rollback)
 */
export async function removeFromLocalStorage(storagePath: string): Promise<void> {
  const fullPath = getLocalFilePath(storagePath)
  if (existsSync(fullPath)) {
    await unlink(fullPath)
  }
}
