/**
 * Verify Property Status API
 *
 * Returns deed and hash status for a property: no_deed | no_hash | ready
 * Task Reference: 7.2 - property-centric verification flow
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errors'

export type PropertyVerificationStatus = 'no_deed' | 'no_hash' | 'ready'

export interface PropertyStatusResponse {
  status: PropertyVerificationStatus
  property?: {
    id: string
    property_no: string
    address: string | null
    owner_name: string | null
  }
  document?: {
    id: string
    doc_number: string
    original_filename: string | null
  }
}

/**
 * GET /api/verify/property-status?propertyId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    await requireRoleAPI('verifier')

    const propertyId = request.nextUrl.searchParams.get('propertyId')
    if (!propertyId) {
      return NextResponse.json(
        { error: 'propertyId is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: property, error: propError } = await supabase
      .from('ver_properties')
      .select('id, property_no, address, owner_name')
      .eq('id', propertyId)
      .single()

    if (propError || !property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    const { data: documents, error: docError } = await supabase
      .from('ver_documents')
      .select('id, doc_number, original_filename, status')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })

    if (docError || !documents || documents.length === 0) {
      return NextResponse.json({
        status: 'no_deed' as PropertyVerificationStatus,
        property: {
          id: property.id,
          property_no: property.property_no,
          address: property.address,
          owner_name: property.owner_name,
        },
      } satisfies PropertyStatusResponse)
    }

    const hashedDoc = documents.find((d) => d.status === 'hashed')
    if (hashedDoc) {
      return NextResponse.json({
        status: 'ready' as PropertyVerificationStatus,
        property: {
          id: property.id,
          property_no: property.property_no,
          address: property.address,
          owner_name: property.owner_name,
        },
        document: {
          id: hashedDoc.id,
          doc_number: hashedDoc.doc_number,
          original_filename: hashedDoc.original_filename,
        },
      } satisfies PropertyStatusResponse)
    }

    const deedDoc = documents[0]
    return NextResponse.json({
      status: 'no_hash' as PropertyVerificationStatus,
      property: {
        id: property.id,
        property_no: property.property_no,
        address: property.address,
        owner_name: property.owner_name,
      },
      document: {
        id: deedDoc.id,
        doc_number: deedDoc.doc_number,
        original_filename: deedDoc.original_filename,
      },
    } satisfies PropertyStatusResponse)
  } catch (error) {
    return handleApiError(error)
  }
}
