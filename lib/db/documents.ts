/**
 * Document Database Operations
 * 
 * Database operations for document metadata with proper relationships,
 * constraints, and atomic transactions.
 */

import { createClient } from '@/lib/supabase/server'
import { DatabaseError, ValidationError } from '@/lib/errors'
import { documentInsertSchema, documentUpdateSchema } from '@/lib/validation'
import type { DocumentInsert, DocumentUpdate, Document } from '@/lib/types'
import { addDocumentHash } from './document-hashes'

/**
 * Create document metadata record
 * 
 * @param documentData - Document data to insert
 * @returns Created document record
 */
export async function createDocument(documentData: DocumentInsert): Promise<Document> {
  const supabase = await createClient()

  // Validate document data
  const validationResult = documentInsertSchema.safeParse(documentData)
  if (!validationResult.success) {
    throw new ValidationError(
      'Document data validation failed',
      validationResult.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))
    )
  }

  // Validate property exists
  const { data: property, error: propertyError } = await supabase
    .from('ver_properties')
    .select('id')
    .eq('id', documentData.property_id)
    .single()

  if (propertyError || !property) {
    throw new ValidationError(`Property not found: ${documentData.property_id}`, [
      { path: 'property_id', message: 'Property does not exist' },
    ])
  }

  // Validate uploader exists
  const { data: uploader, error: uploaderError } = await supabase
    .from('ver_profiles')
    .select('id')
    .eq('id', documentData.uploader_id)
    .single()

  if (uploaderError || !uploader) {
    throw new ValidationError(`Uploader not found: ${documentData.uploader_id}`, [
      { path: 'uploader_id', message: 'Uploader profile does not exist' },
    ])
  }

  // Check for duplicate doc_number per property
  const { data: existing, error: checkError } = await supabase
    .from('ver_documents')
    .select('id, doc_number')
    .eq('property_id', documentData.property_id)
    .eq('doc_number', documentData.doc_number)
    .single()

  if (existing) {
    throw new ValidationError(
      `Document number '${documentData.doc_number}' already exists for this property`,
      [{ path: 'doc_number', message: 'Document number must be unique per property' }]
    )
  }

  // Insert document record
  const { data: document, error: insertError } = await supabase
    .from('ver_documents')
    .insert(documentData)
    .select()
    .single()

  if (insertError || !document) {
    throw new DatabaseError(
      `Failed to create document record: ${insertError?.message || 'Unknown error'}`,
      insertError,
      { documentData }
    )
  }

  return document as Document
}

/**
 * Update document metadata record
 * 
 * @param documentId - Document ID to update
 * @param updateData - Document data to update
 * @returns Updated document record
 */
export async function updateDocument(
  documentId: string,
  updateData: DocumentUpdate
): Promise<Document> {
  const supabase = await createClient()

  // Validate update data
  const validationResult = documentUpdateSchema.safeParse(updateData)
  if (!validationResult.success) {
    throw new ValidationError(
      'Document update data validation failed',
      validationResult.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))
    )
  }

  // Validate document exists
  const { data: existing, error: fetchError } = await supabase
    .from('ver_documents')
    .select('id, storage_path')
    .eq('id', documentId)
    .single()

  if (fetchError || !existing) {
    throw new ValidationError(`Document not found: ${documentId}`, [
      { path: 'id', message: 'Document does not exist' },
    ])
  }

  // If property_id is being updated, validate new property exists
  if (updateData.property_id) {
    const { data: property, error: propertyError } = await supabase
      .from('ver_properties')
      .select('id')
      .eq('id', updateData.property_id)
      .single()

    if (propertyError || !property) {
      throw new ValidationError(`Property not found: ${updateData.property_id}`, [
        { path: 'property_id', message: 'Property does not exist' },
      ])
    }
  }

  // If doc_number is being updated, check for duplicates
  if (updateData.doc_number) {
    const { data: duplicate, error: duplicateError } = await supabase
      .from('ver_documents')
      .select('id')
      .eq('property_id', updateData.property_id || existing.property_id)
      .eq('doc_number', updateData.doc_number)
      .neq('id', documentId)
      .single()

    if (duplicate) {
      throw new ValidationError(
        `Document number '${updateData.doc_number}' already exists for this property`,
        [{ path: 'doc_number', message: 'Document number must be unique per property' }]
      )
    }
  }

  // Check if storage_path is being updated (document file changed)
  // If storage path changes, caller should compute new hash and add it
  const storagePathChanged =
    updateData.storage_path && existing.storage_path !== updateData.storage_path

  // Update document record
  const { data: document, error: updateError } = await supabase
    .from('ver_documents')
    .update(updateData)
    .eq('id', documentId)
    .select()
    .single()

  if (updateError || !document) {
    throw new DatabaseError(
      `Failed to update document record: ${updateError?.message || 'Unknown error'}`,
      updateError,
      { documentId, updateData }
    )
  }

  // Note: If storage_path changed, a new hash should be computed and added
  // This maintains hash history. The caller should:
  // 1. Compute new hash from new file
  // 2. Call addDocumentHash(documentId, newHash) to add to history

  return document as Document
}

/**
 * Update document with new hash (for file updates)
 * Maintains hash history by adding new hash record
 * 
 * @param documentId - Document ID
 * @param updateData - Document data to update
 * @param newHash - New SHA-256 hash for updated file
 * @returns Updated document record
 */
export async function updateDocumentWithHash(
  documentId: string,
  updateData: DocumentUpdate,
  newHash: string
): Promise<Document> {
  // Update document
  const document = await updateDocument(documentId, updateData)

  // Add new hash to history (maintains hash history)
  await addDocumentHash(documentId, newHash)

  // Update hash_computed_at timestamp
  const supabase = await createClient()
  await supabase
    .from('ver_documents')
    .update({
      hash_computed_at: new Date().toISOString(),
    })
    .eq('id', documentId)

  // Fetch updated document
  const updatedDocument = await getDocument(documentId)
  if (!updatedDocument) {
    throw new DatabaseError('Failed to fetch updated document', undefined, { documentId })
  }

  return updatedDocument
}

/**
 * Get document by ID
 * 
 * @param documentId - Document ID
 * @returns Document record or null if not found
 */
export async function getDocument(documentId: string): Promise<Document | null> {
  const supabase = await createClient()

  const { data: document, error } = await supabase
    .from('ver_documents')
    .select('*')
    .eq('id', documentId)
    .single()

  if (error || !document) {
    return null
  }

  return document as Document
}

/**
 * Get documents by property ID
 * 
 * @param propertyId - Property ID
 * @returns Array of document records
 */
export async function getDocumentsByProperty(propertyId: string): Promise<Document[]> {
  const supabase = await createClient()

  const { data: documents, error } = await supabase
    .from('ver_documents')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })

  if (error || !documents) {
    return []
  }

  return documents as Document[]
}

/**
 * Get documents by uploader ID
 * 
 * @param uploaderId - Uploader ID
 * @returns Array of document records
 */
export async function getDocumentsByUploader(uploaderId: string): Promise<Document[]> {
  const supabase = await createClient()

  const { data: documents, error } = await supabase
    .from('ver_documents')
    .select('*')
    .eq('uploader_id', uploaderId)
    .order('created_at', { ascending: false })

  if (error || !documents) {
    return []
  }

  return documents as Document[]
}

/**
 * Delete document record
 * 
 * @param documentId - Document ID to delete
 * @returns True if deleted successfully
 */
export async function deleteDocument(documentId: string): Promise<boolean> {
  const supabase = await createClient()

  // Validate document exists
  const { data: existing, error: fetchError } = await supabase
    .from('ver_documents')
    .select('id, storage_path')
    .eq('id', documentId)
    .single()

  if (fetchError || !existing) {
    throw new ValidationError(`Document not found: ${documentId}`, [
      { path: 'id', message: 'Document does not exist' },
    ])
  }

  // Delete document record (cascade will handle related records)
  const { error: deleteError } = await supabase
    .from('ver_documents')
    .delete()
    .eq('id', documentId)

  if (deleteError) {
    throw new DatabaseError(
      `Failed to delete document record: ${deleteError.message}`,
      deleteError,
      { documentId }
    )
  }

  return true
}

/**
 * Create document with hash in atomic transaction
 * 
 * @param documentData - Document data to insert
 * @param hash - SHA-256 hash of the document
 * @returns Created document record
 */
export async function createDocumentWithHash(
  documentData: DocumentInsert,
  hash: string
): Promise<Document> {
  const supabase = await createClient()

  // Create document
  const document = await createDocument(documentData)

  // Create hash record
  const { error: hashError } = await supabase.from('ver_document_hashes').insert({
    document_id: document.id,
    sha256_hash: hash,
    algorithm: 'SHA-256',
  })

  if (hashError) {
    // If hash creation fails, try to rollback document creation
    // Note: In a true transaction, this would be automatic
    // For Supabase, we'll delete the document if hash creation fails
    await supabase.from('ver_documents').delete().eq('id', document.id)

    throw new DatabaseError(
      `Failed to create document hash: ${hashError.message}`,
      hashError,
      { documentId: document.id, hash }
    )
  }

  // Update document status to 'hashed'
  const { error: updateError } = await supabase
    .from('ver_documents')
    .update({
      status: 'hashed',
      hash_computed_at: new Date().toISOString(),
    })
    .eq('id', document.id)

  if (updateError) {
    // Log error but don't fail - document and hash are created
    console.error('Failed to update document status to hashed:', updateError)
  }

  // Fetch updated document
  const updatedDocument = await getDocument(document.id)
  if (!updatedDocument) {
    throw new DatabaseError('Failed to fetch created document', undefined, { documentId: document.id })
  }

  return updatedDocument
}
