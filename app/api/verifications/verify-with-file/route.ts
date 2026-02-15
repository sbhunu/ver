/**
 * Verify Document with File API Route
 *
 * Computes SHA-256 of uploaded file, compares with stored hash, creates
 * verification record and updates document status. Verifier role required.
 * FormData: file, documentId.
 * Task Reference: 7.2, 7.3
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { requireRoleAPI } from '@/lib/auth/require-role'
import { getLatestDocumentHash } from '@/lib/db/document-hashes'
import { handleApiError } from '@/lib/errors'
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from '@/lib/validation/schemas'
import type { VerificationInsert } from '@/lib/types'

/**
 * Constant-time string compare to avoid timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return out === 0
}

/**
 * POST /api/verifications/verify-with-file
 *
 * FormData: file, documentId. Computes hash, compares with stored hash, writes verification.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRoleAPI('verifier')

    const formData = await request.formData()
    const file = formData.get('file')
    const documentId = formData.get('documentId')

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      )
    }

    if (!documentId || typeof documentId !== 'string') {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
        },
        { status: 400 }
      )
    }

    const mime = file.type || 'application/octet-stream'
    if (!ALLOWED_MIME_TYPES.includes(mime as (typeof ALLOWED_MIME_TYPES)[number])) {
      return NextResponse.json(
        {
          error: `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
        },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: doc, error: docError } = await supabase
      .from('ver_documents')
      .select('id, status, file_size')
      .eq('id', documentId)
      .single()

    if (docError || !doc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    if (doc.status !== 'hashed') {
      return NextResponse.json(
        { error: 'Document must be in hashed status for verification' },
        { status: 400 }
      )
    }

    const startTime = Date.now()
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const computedHash = createHash('sha256').update(buffer).digest('hex')
    const computationDurationMs = Date.now() - startTime

    const storedHashRecord = await getLatestDocumentHash(documentId)
    if (!storedHashRecord) {
      return NextResponse.json(
        { error: 'No stored hash found for this document' },
        { status: 400 }
      )
    }

    const storedHash = storedHashRecord.sha256_hash
    const hashMatch = constantTimeCompare(
      computedHash.toLowerCase(),
      storedHash.toLowerCase()
    )

    const status: 'verified' | 'rejected' = hashMatch ? 'verified' : 'rejected'
    const reason = hashMatch
      ? null
      : 'Hash of submitted document does not match the stored deed hash.'

    const discrepancyMetadata = hashMatch
      ? null
      : {
          hash_mismatch: true,
          file_size_difference: doc.file_size != null ? file.size - doc.file_size : undefined,
          other_discrepancies: {
            computed_hash: computedHash,
            stored_hash: storedHash,
          },
        }

    const verificationData: VerificationInsert = {
      document_id: documentId,
      verifier_id: user.id,
      status,
      reason,
      verification_storage_path: null,
      discrepancy_metadata: discrepancyMetadata,
    }

    const { data: verification, error: verError } = await supabase
      .from('ver_verifications')
      .insert(verificationData)
      .select()
      .single()

    if (verError || !verification) {
      console.error('Verification insert error:', verError)
      return NextResponse.json(
        { error: verError?.message ?? 'Failed to create verification record' },
        { status: 500 }
      )
    }

    const newDocStatus = status === 'verified' ? 'verified' : 'rejected'
    await supabase
      .from('ver_documents')
      .update({
        status: newDocStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)

    return NextResponse.json(
      {
        success: true,
        data: {
          message: 'Verification completed',
          documentId,
          verification: {
            id: verification.id,
            status: verification.status,
            reason: verification.reason,
            hashMatch,
            computedHash,
            storedHash,
            discrepancyMetadata: verification.discrepancy_metadata ?? {},
          },
          fileInfo: {
            fileSize: file.size,
            mimeType: mime,
            fileName: file.name ?? undefined,
            computationDurationMs,
          },
        },
      },
      { status: 200 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}
