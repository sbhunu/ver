/**
 * Property by ID API Route
 * 
 * Handles individual property operations (GET, PUT, DELETE)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI } from '@/lib/auth/require-role'
import { getProperty, updateProperty, deleteProperty } from '@/lib/db/properties'
import { handleApiError } from '@/lib/errors'
import { propertyUpdateSchema } from '@/lib/validation'

/**
 * GET /api/properties/[id]
 * 
 * Get a property by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authenticated user (any role can view properties)
    await requireRoleAPI('staff')

    const property = await getProperty(params.id)

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    return NextResponse.json({ property })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * PUT /api/properties/[id]
 * 
 * Update a property
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require verifier role or higher
    await requireRoleAPI('verifier')

    const body = await request.json()

    // Validate request body
    const validationResult = propertyUpdateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues,
        },
        { status: 400 }
      )
    }

    // Handle geometry conversion (WKT or GeoJSON to PostGIS)
    const propertyData = validationResult.data

    // If geometry is a string, it might be WKT - PostGIS will handle it
    // If geometry is an object, it's GeoJSON - convert to string for PostGIS
    if (propertyData.geom && typeof propertyData.geom === 'object') {
      // GeoJSON object - will be handled by PostGIS ST_GeomFromGeoJSON
      propertyData.geom = JSON.stringify(propertyData.geom)
    }

    const property = await updateProperty(params.id, propertyData)

    return NextResponse.json({ property })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * DELETE /api/properties/[id]
 * 
 * Delete a property
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require admin role for deletion
    await requireRoleAPI('admin')

    await deleteProperty(params.id)

    return NextResponse.json({ message: 'Property deleted successfully' }, { status: 200 })
  } catch (error) {
    return handleApiError(error)
  }
}
