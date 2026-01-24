/**
 * Report Generate API Route
 *
 * Proxies report generation to the reports Edge Function with user JWT.
 * Chief_registrar and admin only. Task Reference: 10.1, 10.2, 10.3
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRoleAPI } from '@/lib/auth/require-role'
import { handleApiError } from '@/lib/errors'

const FILTER_KEYS = [
  'startDate',
  'endDate',
  'actionType',
  'actorId',
  'status',
  'verifierId',
  'propertyNumber',
] as const

/**
 * GET /api/reports/generate
 *
 * Query params: type, format, and filter keys (startDate, endDate, etc.)
 * Proxies to Supabase reports Edge Function with user JWT.
 */
export async function GET(request: NextRequest) {
  try {
    await requireRoleAPI('chief_registrar')

    const supabase = await createClient()
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session?.access_token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const type = url.searchParams.get('type')
    const format = url.searchParams.get('format') || 'json'

    if (!type) {
      return NextResponse.json(
        { error: 'Missing required parameter: type' },
        { status: 400 }
      )
    }

    const validTypes = ['audit-logs', 'verification-reports', 'property-listings']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const validFormats = ['json', 'csv', 'pdf']
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: `Invalid format. Must be one of: ${validFormats.join(', ')}` },
        { status: 400 }
      )
    }

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!base) {
      return NextResponse.json(
        { error: 'Reports service not configured' },
        { status: 500 }
      )
    }

    const params = new URLSearchParams()
    params.set('type', type)
    params.set('format', format)
    for (const key of FILTER_KEYS) {
      const v = url.searchParams.get(key)
      if (v) params.set(key, v)
    }

    const fnUrl = `${base}/functions/v1/reports?${params.toString()}`
    const fnRes = await fetch(fnUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    const contentType = fnRes.headers.get('Content-Type') || 'application/json'
    const contentDisposition = fnRes.headers.get('Content-Disposition')
    const body = await fnRes.arrayBuffer()

    if (!fnRes.ok) {
      try {
        const err = JSON.parse(new TextDecoder().decode(body)) as { error?: string }
        return NextResponse.json(
          { error: err.error ?? `Reports service error: ${fnRes.status}` },
          { status: fnRes.status }
        )
      } catch {
        return NextResponse.json(
          { error: `Reports service error: ${fnRes.status}` },
          { status: fnRes.status }
        )
      }
    }

    const headers: Record<string, string> = { 'Content-Type': contentType }
    if (contentDisposition) headers['Content-Disposition'] = contentDisposition

    return new NextResponse(body, {
      status: 200,
      headers,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
