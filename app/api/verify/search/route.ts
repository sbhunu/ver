/**
 * Verify Search API
 *
 * Search properties by address, property_no (Deed #), or doc_number.
 * Returns properties with optional deed/hash status for verification.
 * Task Reference: 7.2 - property-centric verification flow
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errors'

export interface SearchResultItem {
  id: string
  property_no: string
  address: string | null
  owner_name: string | null
}

/**
 * GET /api/verify/search?q=xxx&limit=20
 *
 * - Searches ver_properties by property_no, address, owner_name
 * - If no property match, searches ver_documents by doc_number and returns linked properties
 */
export async function GET(request: NextRequest) {
  try {
    await requireRoleAPI('verifier')

    const q = request.nextUrl.searchParams.get('q')?.trim()
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get('limit') || '50', 10),
      100
    )

    if (!q || q.length < 1) {
      return NextResponse.json({ results: [] })
    }

    const supabase = await createClient()
    const pattern = `%${q}%`

    const { data: properties, error: propError } = await supabase
      .from('ver_properties')
      .select('id, property_no, address, owner_name')
      .or(`property_no.ilike.${pattern},address.ilike.${pattern},owner_name.ilike.${pattern}`)
      .limit(limit)

    if (propError) {
      return NextResponse.json({ results: [] })
    }

    if (properties && properties.length > 0) {
      return NextResponse.json({
        results: properties.map((p) => ({
          id: p.id,
          property_no: p.property_no,
          address: p.address,
          owner_name: p.owner_name,
        })),
      })
    }

    const { data: docs, error: docError } = await supabase
      .from('ver_documents')
      .select('property_id')
      .ilike('doc_number', pattern)
      .limit(limit)

    if (docError || !docs || docs.length === 0) {
      return NextResponse.json({ results: [] })
    }

    const propertyIds = [...new Set(docs.map((d) => d.property_id))]
    const { data: propsByDoc, error: propsError } = await supabase
      .from('ver_properties')
      .select('id, property_no, address, owner_name')
      .in('id', propertyIds)

    if (propsError || !propsByDoc) {
      return NextResponse.json({ results: [] })
    }

    return NextResponse.json({
      results: propsByDoc.map((p) => ({
        id: p.id,
        property_no: p.property_no,
        address: p.address,
        owner_name: p.owner_name,
      })),
    })
  } catch (error) {
    return handleApiError(error)
  }
}
