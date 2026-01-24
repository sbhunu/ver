/**
 * Verification Database Operations
 * 
 * Database operations for verification records
 */

import { createClient } from '@/lib/supabase/server'
import { DatabaseError, ValidationError } from '@/lib/errors'
import type { Verification, VerificationInsert } from '@/lib/types'

/**
 * Get verifications by verifier ID
 * 
 * @param verifierId - Verifier ID
 * @returns Array of verification records
 */
export async function getVerificationsByVerifier(verifierId: string): Promise<Verification[]> {
  const supabase = await createClient()

  const { data: verifications, error } = await supabase
    .from('ver_verifications')
    .select('*')
    .eq('verifier_id', verifierId)
    .order('created_at', { ascending: false })

  if (error || !verifications) {
    return []
  }

  return verifications as Verification[]
}

/**
 * Get verification by document ID (latest only)
 *
 * @param documentId - Document ID
 * @returns Verification record or null
 */
export async function getVerificationByDocument(documentId: string): Promise<Verification | null> {
  const supabase = await createClient()

  const { data: verification, error } = await supabase
    .from('ver_verifications')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !verification) {
    return null
  }

  return verification as Verification
}

/**
 * Get all verifications for a document (verification history)
 *
 * @param documentId - Document ID
 * @returns Array of verification records, newest first
 */
export async function getVerificationsByDocument(
  documentId: string
): Promise<Verification[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ver_verifications')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })

  if (error || !data) {
    return []
  }

  return data as Verification[]
}

/**
 * Get documents ready for verification (hashed status)
 * 
 * @returns Array of documents ready for verification
 */
export async function getDocumentsReadyForVerification(): Promise<any[]> {
  const supabase = await createClient()

  const { data: documents, error } = await supabase
    .from('ver_documents')
    .select('*')
    .eq('status', 'hashed')
    .order('created_at', { ascending: true })

  if (error || !documents) {
    return []
  }

  return documents
}

/**
 * Get documents assigned to verifier (documents they've verified)
 * 
 * @param verifierId - Verifier ID
 * @returns Array of documents with verification info
 */
export async function getAssignedDocuments(verifierId: string): Promise<any[]> {
  const supabase = await createClient()

  // Get documents that have been verified by this verifier
  const { data: verifications, error: verError } = await supabase
    .from('ver_verifications')
    .select('document_id, status, reason, created_at')
    .eq('verifier_id', verifierId)
    .order('created_at', { ascending: false })

  if (verError || !verifications || verifications.length === 0) {
    return []
  }

  // Get document details for each verification
  const documentIds = verifications.map((v) => v.document_id)
  const { data: documents, error: docError } = await supabase
    .from('ver_documents')
    .select('*')
    .in('id', documentIds)

  if (docError || !documents) {
    return []
  }

  // Combine documents with verification info
  return documents.map((doc) => {
    const verification = verifications.find((v) => v.document_id === doc.id)
    return {
      ...doc,
      verification: verification || null,
    }
  })
}
