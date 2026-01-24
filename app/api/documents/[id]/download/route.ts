/**
 * Document Download API Route
 *
 * GET /api/documents/[id]/download
 * Creates a short-lived signed URL and redirects to it for download.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { getDocument } from '@/lib/db/documents'
import { handleApiError } from '@/lib/errors'

const SIGNED_URL_EXPIRY_SEC = 60

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

    const supabase = await createClient()
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(document.storage_path, SIGNED_URL_EXPIRY_SEC)

    if (error || !data?.signedUrl) {
      console.error('Document download signed URL error:', error)
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
