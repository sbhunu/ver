/**
 * Property Management API Route
 *
 * GET /api/properties/management
 * Returns paginated properties with their documents (deeds) for the Property Management page.
 * Supports search (property_no, address, owner_name), status filter, sort, and pagination.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI } from '@/lib/auth/require-role'
import { getProperties } from '@/lib/db/properties'
import { getDocumentsByProperty } from '@/lib/db/documents'
import { handleApiError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    await requireRoleAPI('staff')

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('page_size') || '20', 10)
    const sortBy = searchParams.get('sort_by') as
      | 'created_at'
      | 'updated_at'
      | 'property_no'
      | 'address'
      | 'registration_date'
      | undefined
    const sortOrder = (searchParams.get('sort_order') as 'asc' | 'desc' | undefined) || 'desc'
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined

    const result = await getProperties({
      page,
      pageSize,
      sortBy,
      sortOrder,
      status,
      search,
    })

    // Fetch documents for each property
    const propertiesWithDocs = await Promise.all(
      result.properties.map(async (p) => {
        const documents = await getDocumentsByProperty(p.id)
        return { ...p, documents }
      })
    )

    return NextResponse.json({
      ...result,
      properties: propertiesWithDocs,
    })
  } catch (e) {
    return handleApiError(e)
  }
}
