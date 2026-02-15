/**
 * Document Upload Server Action
 *
 * Next.js 16.* App Router server action for secure document upload
 * with validation and metadata capture. For demo, stores files in
 * storage_records (local filesystem); references use same path format
 * as Supabase Storage: property-{id}/documents/{uuid}-{filename}
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { validateFileUploadWithHash } from '@/lib/validation'
import { sanitizeFilename } from '@/lib/utils/file'
import {
  saveToLocalStorage,
  removeFromLocalStorage,
} from '@/lib/storage/local-storage'
import { randomUUID } from 'crypto'
import { ValidationError, UploadError, DatabaseError } from '@/lib/errors'
import type { DocumentInsert } from '@/lib/types'
import { createDocumentWithHash } from '@/lib/db/documents'

/**
 * Virus scanning placeholder
 * In production, integrate with actual virus scanning service
 */
async function scanForVirus(file: File): Promise<{ safe: boolean; reason?: string }> {
  // TODO: Integrate with virus scanning service (e.g., ClamAV, VirusTotal API)
  // For now, return safe for all files
  // In production, implement actual virus scanning:
  // 1. Send file to scanning service
  // 2. Wait for scan result
  // 3. Return { safe: false, reason: 'Virus detected: ...' } if infected
  
  return { safe: true }
}

/**
 * Upload document server action
 * 
 * @param formData - FormData containing file and metadata
 * @returns Upload result with document ID and metadata
 */
export async function uploadDocument(formData: FormData) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new ValidationError('Authentication required', [], { statusCode: 401 })
    }

    // Get user profile to verify role
    const { data: profile, error: profileError } = await supabase
      .from('ver_profiles')
      .select('id, email, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      throw new ValidationError('User profile not found', [], { statusCode: 404 })
    }

    // Validate and extract file
    const fileResult = await validateFileUploadWithHash(formData, 'file')

    if (!fileResult.success) {
      return {
        success: false,
        error: fileResult.error.message,
        validationErrors: fileResult.error.validationErrors,
      }
    }

    const { file, metadata, sanitizedFilename, hash } = fileResult

    // Virus scanning placeholder
    const virusScan = await scanForVirus(file)
    if (!virusScan.safe) {
      throw new UploadError(
        `File failed virus scan: ${virusScan.reason || 'Unknown threat detected'}`,
        { filename: file.name }
      )
    }

    // Extract metadata from form data
    const propertyId = formData.get('property_id') as string
    const docNumber = formData.get('doc_number') as string

    if (!propertyId || !docNumber) {
      throw new ValidationError('property_id and doc_number are required', [
        { path: 'property_id', message: propertyId ? '' : 'property_id is required' },
        { path: 'doc_number', message: docNumber ? '' : 'doc_number is required' },
      ])
    }

    // Validate property exists
    const { data: property, error: propertyError } = await supabase
      .from('ver_properties')
      .select('id')
      .eq('id', propertyId)
      .single()

    if (propertyError || !property) {
      throw new ValidationError(`Property not found: ${propertyId}`, [
        { path: 'property_id', message: 'Property does not exist' },
      ])
    }

    // Generate document UUID and storage path
    const documentId = randomUUID()
    const storagePath = `property-${propertyId}/documents/${documentId}-${sanitizedFilename}`

    // Save file to storage_records (local filesystem) for demo
    const fileBuffer = await file.arrayBuffer()
    try {
      await saveToLocalStorage(storagePath, fileBuffer)
    } catch (uploadError) {
      const err = uploadError as Error
      throw new UploadError(
        `Failed to save file to storage_records: ${err.message}`,
        {
          filename: file.name,
          storagePath,
          originalError: err.message,
        }
      )
    }

    // Create document record in database with hash (atomic operation)
    // This ensures document and hash are created together, or both fail
    const documentData: DocumentInsert = {
      id: documentId,
      property_id: propertyId,
      doc_number: docNumber.trim(),
      uploader_id: profile.id,
      status: 'pending', // Will be updated to 'hashed' by createDocumentWithHash
      storage_path: storagePath,
      file_size: file.size,
      mime_type: metadata.mimeType || file.type,
      original_filename: sanitizedFilename,
      hash_computed_at: null, // Will be set by createDocumentWithHash
    }

    let document
    try {
      // Create document with hash in atomic operation
      // If hash creation fails, document creation is rolled back
      document = await createDocumentWithHash(documentData, hash)
    } catch (error) {
      // If database operation fails, clean up file from storage_records
      await removeFromLocalStorage(storagePath)

      // Re-throw the error
      throw error
    }

    return {
      success: true,
      document: {
        id: document.id,
        property_id: document.property_id,
        doc_number: document.doc_number,
        status: document.status,
        storage_path: document.storage_path,
        file_size: document.file_size,
        mime_type: document.mime_type,
        original_filename: document.original_filename,
        hash: hash,
        created_at: document.created_at,
      },
    }
  } catch (error) {
    // Handle known error types
    if (error instanceof ValidationError) {
      return {
        success: false,
        error: error.message,
        validationErrors: error.validationErrors,
      }
    }

    if (error instanceof UploadError) {
      return {
        success: false,
        error: error.message,
        context: error.context,
      }
    }

    if (error instanceof DatabaseError) {
      return {
        success: false,
        error: error.message,
        context: error.context,
      }
    }

    // Handle unknown errors
    console.error('Unexpected error in uploadDocument:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

/**
 * Upload result type
 */
export type UploadDocumentResult =
  | {
      success: true
      document: {
        id: string
        property_id: string
        doc_number: string
        status: string
        storage_path: string
        file_size: number | null
        mime_type: string | null
        original_filename: string | null
        hash: string
        created_at: string
      }
    }
  | {
      success: false
      error: string
      validationErrors?: Array<{ path: string | number; message: string }>
      context?: Record<string, unknown>
    }
