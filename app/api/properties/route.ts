/**
 * Properties API Route
 * 
 * Handles property CRUD operations with PostGIS spatial query support
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI } from '@/lib/auth/require-role'
import {
  createProperty,
  getProperties,
  getProperty,
  updateProperty,
  deleteProperty,
  findPropertiesContainingPoint,
  findPropertiesIntersecting,
  findPropertiesWithin,
  findPropertiesInBoundingBox,
  findPropertiesWithinDistance,
} from '@/lib/db/properties'
import { handleApiError } from '@/lib/errors'
import { propertyInsertSchema, propertyUpdateSchema } from '@/lib/validation'

/**
 * GET /api/properties
 * 
 * Get properties with pagination, sorting, and spatial filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Require authenticated user (any role can view properties)
    await requireRoleAPI('staff')

    const searchParams = request.nextUrl.searchParams

    // Check for spatial queries
    const pointLng = searchParams.get('point_lng')
    const pointLat = searchParams.get('point_lat')
    const distance = searchParams.get('distance')
    const bboxMinLng = searchParams.get('bbox_min_lng')
    const bboxMinLat = searchParams.get('bbox_min_lat')
    const bboxMaxLng = searchParams.get('bbox_max_lng')
    const bboxMaxLat = searchParams.get('bbox_max_lat')
    const intersects = searchParams.get('intersects') // GeoJSON or WKT string
    const within = searchParams.get('within') // GeoJSON or WKT string

    // Handle point-in-polygon query (ST_Contains)
    if (pointLng && pointLat) {
      const lng = parseFloat(pointLng)
      const lat = parseFloat(pointLat)

      if (isNaN(lng) || isNaN(lat)) {
        return NextResponse.json(
          { error: 'Invalid point coordinates' },
          { status: 400 }
        )
      }

      const properties = await findPropertiesContainingPoint(lng, lat)
      return NextResponse.json({ properties, count: properties.length })
    }

    // Handle distance query (ST_DWithin)
    if (pointLng && pointLat && distance) {
      const lng = parseFloat(pointLng)
      const lat = parseFloat(pointLat)
      const dist = parseFloat(distance)

      if (isNaN(lng) || isNaN(lat) || isNaN(dist) || dist <= 0) {
        return NextResponse.json(
          { error: 'Invalid point coordinates or distance' },
          { status: 400 }
        )
      }

      const properties = await findPropertiesWithinDistance(lng, lat, dist)
      return NextResponse.json({ properties, count: properties.length })
    }

    // Handle bounding box query
    if (bboxMinLng && bboxMinLat && bboxMaxLng && bboxMaxLat) {
      const minLng = parseFloat(bboxMinLng)
      const minLat = parseFloat(bboxMinLat)
      const maxLng = parseFloat(bboxMaxLng)
      const maxLat = parseFloat(bboxMaxLat)

      if (
        isNaN(minLng) ||
        isNaN(minLat) ||
        isNaN(maxLng) ||
        isNaN(maxLat) ||
        minLng >= maxLng ||
        minLat >= maxLat
      ) {
        return NextResponse.json(
          { error: 'Invalid bounding box coordinates' },
          { status: 400 }
        )
      }

      const properties = await findPropertiesInBoundingBox(minLng, minLat, maxLng, maxLat)
      return NextResponse.json({ properties, count: properties.length })
    }

    // Handle intersects query (ST_Intersects)
    if (intersects) {
      try {
        const properties = await findPropertiesIntersecting(intersects)
        return NextResponse.json({ properties, count: properties.length })
      } catch (error) {
        return handleApiError(error)
      }
    }

    // Handle within query (ST_Within)
    if (within) {
      try {
        const properties = await findPropertiesWithin(within)
        return NextResponse.json({ properties, count: properties.length })
      } catch (error) {
        return handleApiError(error)
      }
    }

    // Regular paginated query
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

    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/properties
 * 
 * Create a new property
 */
export async function POST(request: NextRequest) {
  try {
    // Require verifier role or higher
    await requireRoleAPI('verifier')

    const body = await request.json()

    // Validate request body
    const validationResult = propertyInsertSchema.safeParse(body)
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

    const property = await createProperty(propertyData)

    return NextResponse.json({ property }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
