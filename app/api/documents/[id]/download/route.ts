/**
 * Document Download API Route
 *
 * GET /api/documents/[id]/download
 * Serves document from storage_records (local) or Supabase Storage.
 * For demo, documents are stored in storage_records and streamed directly.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { getDocument } from '@/lib/db/documents'
import { handleApiError } from '@/lib/errors'
import {
  existsInLocalStorage,
  createReadStreamFromLocalStorage,
} from '@/lib/storage/local-storage'

export async function GET(
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

    const { storage_path } = document

    // Serve from storage_records if available (demo mode)
    if (existsInLocalStorage(storage_path)) {
      const stream = createReadStreamFromLocalStorage(storage_path)
      const mimeType = document.mime_type || 'application/octet-stream'
      const filename = document.original_filename || 'document'
      return new NextResponse(stream, {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        },
      })
    }

    // Fallback to Supabase Storage
    const supabase = await createClient()
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(storage_path, 60)

    if (error || !data?.signedUrl) {
      console.error('Document download error:', error)
      return NextResponse.json(
        { error: error?.message ?? 'Failed to create download link' },
        { status: 500 }
      )
    }

    return NextResponse.redirect(data.signedUrl)
  } catch (e) {
    return handleApiError(e)
  }
}
