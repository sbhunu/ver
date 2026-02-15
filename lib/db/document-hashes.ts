/**
 * Document Hash Database Operations
 * 
 * Database operations for storing and managing document hashes
 * with support for hash history and verification.
 */

import { createClient } from '@/lib/supabase/server'
import { DatabaseError, ValidationError } from '@/lib/errors'
import { documentHashInsertSchema } from '@/lib/validation'
import type { DocumentHashInsert, DocumentHash } from '@/lib/types'

/**
 * Create document hash record
 * Uses RLS policy: staff and above can insert hashes for documents they can access.
 *
 * @param hashData - Hash data to insert
 * @returns Created hash record
 */
export async function createDocumentHash(hashData: DocumentHashInsert): Promise<DocumentHash> {
  const supabase = await createClient()

  // Validate hash data
  const validationResult = documentHashInsertSchema.safeParse(hashData)
  if (!validationResult.success) {
    throw new ValidationError(
      'Hash data validation failed',
      validationResult.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))
    )
  }

  // Validate document exists
  const { data: document, error: documentError } = await supabase
    .from('ver_documents')
    .select('id')
    .eq('id', hashData.document_id)
    .single()

  if (documentError || !document) {
    throw new ValidationError(`Document not found: ${hashData.document_id}`, [
      { path: 'document_id', message: 'Document does not exist' },
    ])
  }

  // Insert hash record
  const { data: hash, error: insertError } = await supabase
    .from('ver_document_hashes')
    .insert(hashData)
    .select()
    .single()

  if (insertError || !hash) {
    throw new DatabaseError(
      `Failed to create hash record: ${insertError?.message || 'Unknown error'}`,
      insertError,
      { hashData }
    )
  }

  return hash as DocumentHash
}

/**
 * Get all hashes for a document (hash history)
 * 
 * @param documentId - Document ID
 * @returns Array of hash records ordered by creation date
 */
export async function getDocumentHashes(documentId: string): Promise<DocumentHash[]> {
  const supabase = await createClient()

  const { data: hashes, error } = await supabase
    .from('ver_document_hashes')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: true })

  if (error || !hashes) {
    return []
  }

  return hashes as DocumentHash[]
}

/**
 * Get latest hash for a document
 * 
 * @param documentId - Document ID
 * @returns Latest hash record or null if not found
 */
export async function getLatestDocumentHash(documentId: string): Promise<DocumentHash | null> {
  const supabase = await createClient()

  const { data: hash, error } = await supabase
    .from('ver_document_hashes')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !hash) {
    return null
  }

  return hash as DocumentHash
}

/**
 * Get hash by hash value (for duplicate detection)
 * 
 * @param sha256Hash - SHA-256 hash value
 * @returns Hash record or null if not found
 */
export async function getHashByValue(sha256Hash: string): Promise<DocumentHash | null> {
  const supabase = await createClient()

  const { data: hash, error } = await supabase
    .from('ver_document_hashes')
    .select('*, document_id')
    .eq('sha256_hash', sha256Hash)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !hash) {
    return null
  }

  return hash as DocumentHash
}

/**
 * Check if hash exists for any document
 * 
 * @param sha256Hash - SHA-256 hash value
 * @returns True if hash exists, false otherwise
 */
export async function hashExists(sha256Hash: string): Promise<boolean> {
  const hash = await getHashByValue(sha256Hash)
  return hash !== null
}

/**
 * Add new hash to document (maintains hash history)
 * 
 * @param documentId - Document ID
 * @param sha256Hash - SHA-256 hash value
 * @param algorithm - Hash algorithm (default: 'SHA-256')
 * @returns Created hash record
 */
export async function addDocumentHash(
  documentId: string,
  sha256Hash: string,
  algorithm: string = 'SHA-256'
): Promise<DocumentHash> {
  return createDocumentHash({
    document_id: documentId,
    sha256_hash: sha256Hash,
    algorithm,
  })
}

/**
 * Verify document hash matches stored hash
 * 
 * @param documentId - Document ID
 * @param computedHash - Computed SHA-256 hash
 * @returns True if hash matches, false otherwise
 */
export async function verifyDocumentHash(
  documentId: string,
  computedHash: string
): Promise<boolean> {
  const latestHash = await getLatestDocumentHash(documentId)

  if (!latestHash) {
    return false
  }

  return latestHash.sha256_hash.toLowerCase() === computedHash.toLowerCase()
}

/**
 * Get hash history for a document
 * 
 * @param documentId - Document ID
 * @returns Hash history with metadata
 */
export async function getHashHistory(documentId: string): Promise<{
  hashes: DocumentHash[]
  totalHashes: number
  latestHash: DocumentHash | null
  hashChanges: number
}> {
  const hashes = await getDocumentHashes(documentId)
  const latestHash = hashes.length > 0 ? hashes[hashes.length - 1] : null

  // Count hash changes (different hash values)
  const uniqueHashes = new Set(hashes.map((h) => h.sha256_hash))
  const hashChanges = uniqueHashes.size - 1 // Subtract 1 for initial hash

  return {
    hashes,
    totalHashes: hashes.length,
    latestHash,
    hashChanges: Math.max(0, hashChanges),
  }
}
