/**
 * Verify Document with File API Route
 *
 * Proxies file-based verification to the verify-document Edge Function.
 * Verifier role required. Multipart: file, documentId.
 * Task Reference: 7.2, 7.3
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRoleAPI } from '@/lib/auth/require-role'
import { handleApiError } from '@/lib/errors'
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from '@/lib/validation/schemas'

/**
 * POST /api/verifications/verify-with-file
 *
 * FormData: file, documentId. Proxies to verify-document Edge Function.
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
      .select('id, status')
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

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session?.access_token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!base) {
      return NextResponse.json(
        { error: 'Verification service not configured' },
        { status: 500 }
      )
    }

    const body = {
      documentId,
      verifierId: user.id,
      file: base64,
      fileSize: file.size,
      mimeType: mime,
      fileName: file.name || undefined,
    }

    const fnRes = await fetch(`${base}/functions/v1/verify-document`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const resBody = await fnRes.json()

    if (!fnRes.ok) {
      return NextResponse.json(
        { error: resBody?.error ?? `Verification failed: ${fnRes.status}` },
        { status: fnRes.status }
      )
    }

    return NextResponse.json(resBody, { status: 200 })
  } catch (error) {
    return handleApiError(error)
  }
}
