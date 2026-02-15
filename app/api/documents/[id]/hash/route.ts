/**
 * Document Hash API Route
 *
 * POST /api/documents/[id]/hash
 * Computes SHA-256 hash of an uploaded document and stores it in ver_document_hashes.
 * For demo: reads from storage_records (local) when available; otherwise invokes
 * the hash-document Edge Function (Supabase Storage).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { requireRoleAPI } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { getDocument } from '@/lib/db/documents'
import { createDocumentHash } from '@/lib/db/document-hashes'
import { handleApiError } from '@/lib/errors'
import { existsInLocalStorage, readFromLocalStorage } from '@/lib/storage/local-storage'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireRoleAPI('staff')

    const { id } = await context.params
    const document = await getDocument(id)

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (document.status === 'hashed') {
      return NextResponse.json(
        { message: 'Document already hashed', document_id: id },
        { status: 200 }
      )
    }

    const { storage_path } = document

    // Compute hash from storage_records when available (demo mode)
    if (existsInLocalStorage(storage_path)) {
      const buffer = await readFromLocalStorage(storage_path)
      const hashHex = createHash('sha256').update(buffer).digest('hex')

      const hashRecord = await createDocumentHash({
        document_id: id,
        sha256_hash: hashHex,
        algorithm: 'SHA-256',
      })

      const supabase = await createClient()
      const hashComputedAt = new Date().toISOString()
      await supabase
        .from('ver_documents')
        .update({
          status: 'hashed',
          hash_computed_at: hashComputedAt,
          updated_at: hashComputedAt,
        })
        .eq('id', id)

      return NextResponse.json({
        success: true,
        document_id: id,
        hash: hashRecord.sha256_hash,
        algorithm: 'SHA-256',
        created_at: hashRecord.created_at,
        message: 'Document hashed successfully',
      })
    }

    // Fallback: invoke Edge Function (Supabase Storage)
    const supabase = await createClient()
    const { data, error } = await supabase.functions.invoke('hash-document', {
      body: { document_id: id },
    })

    if (error) {
      console.error('hash-document Edge Function error:', error)
      return NextResponse.json(
        { error: error.message ?? 'Failed to compute hash' },
        { status: 500 }
      )
    }

    const result = data as { success?: boolean; error?: string; document_id?: string }
    if (!result?.success && result?.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      document_id: id,
      message: 'Document hashed successfully',
      ...result,
    })
  } catch (e) {
    return handleApiError(e)
  }
}
