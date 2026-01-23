/**
 * Property Database Operations
 * 
 * Database operations for property management with PostGIS spatial query support,
 * geometry validation, and WKT/GeoJSON format handling.
 */

import { createClient } from '@/lib/supabase/server'
import { DatabaseError, ValidationError } from '@/lib/errors'
import { propertyInsertSchema, propertyUpdateSchema } from '@/lib/validation'
import type { PropertyInsert, PropertyUpdate, Property } from '@/lib/types'

/**
 * Convert WKT (Well-Known Text) to PostGIS geometry
 */
function wktToGeometry(wkt: string): string {
  // PostGIS can handle WKT directly with ST_GeomFromText
  // We'll return the WKT string and let PostGIS handle it
  return wkt
}

/**
 * Convert GeoJSON to PostGIS geometry
 */
function geojsonToGeometry(geojson: unknown): string {
  // PostGIS can handle GeoJSON with ST_GeomFromGeoJSON
  // We'll stringify the GeoJSON and let PostGIS handle it
  return JSON.stringify(geojson)
}

/**
 * Parse geometry input (WKT, GeoJSON, or PostGIS geometry)
 */
function parseGeometryInput(
  geom: string | { type: string; coordinates: unknown } | null | undefined
): string | null {
  if (!geom) {
    return null
  }

  if (typeof geom === 'string') {
    // Check if it's WKT (starts with POINT, POLYGON, etc.)
    const wktPattern = /^(POINT|LINESTRING|POLYGON|MULTIPOINT|MULTILINESTRING|MULTIPOLYGON)\s*\(/i
    if (wktPattern.test(geom.trim())) {
      // WKT format - PostGIS will handle with ST_GeomFromText
      return `ST_GeomFromText('${geom}', 4326)`
    }
    // Assume it's already a PostGIS geometry string
    return geom
  }

  if (typeof geom === 'object' && geom !== null) {
    // GeoJSON format - PostGIS will handle with ST_GeomFromGeoJSON
    return `ST_GeomFromGeoJSON('${JSON.stringify(geom)}')`
  }

  return null
}

/**
 * Create property record
 * 
 * @param propertyData - Property data to insert
 * @returns Created property record
 */
export async function createProperty(propertyData: PropertyInsert): Promise<Property> {
  const supabase = await createClient()

  // Validate property data
  const validationResult = propertyInsertSchema.safeParse(propertyData)
  if (!validationResult.success) {
    throw new ValidationError(
      'Property data validation failed',
      validationResult.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))
    )
  }

  // Check for duplicate property_no
  const { data: existing, error: checkError } = await supabase
    .from('ver_properties')
    .select('id')
    .eq('property_no', propertyData.property_no)
    .single()

  if (existing) {
    throw new ValidationError(`Property number already exists: ${propertyData.property_no}`, [
      { path: 'property_no', message: 'Property number must be unique' },
    ])
  }

  // Prepare insert data
  const insertData: Record<string, unknown> = {
    property_no: propertyData.property_no,
    address: propertyData.address,
    owner_name: (propertyData as any).owner_name || null,
    registration_date: (propertyData as any).registration_date || null,
    status: (propertyData as any).status || 'active',
    metadata: (propertyData as any).metadata || {},
  }

  // Handle geometry - PostGIS triggers will validate and standardize
  if (propertyData.geom) {
    // Geometry will be handled by PostGIS functions in the database
    // We pass it as-is and let the database triggers handle validation
    insertData.geom = propertyData.geom
  }

  // Insert property record
  const { data: property, error: insertError } = await supabase
    .from('ver_properties')
    .insert(insertData)
    .select()
    .single()

  if (insertError) {
    // Handle specific PostGIS errors
    if (insertError.code === '23505') {
      throw new ValidationError(`Property number already exists: ${propertyData.property_no}`, [
        { path: 'property_no', message: 'Property number must be unique' },
      ])
    }

    if (insertError.message.includes('geometry') || insertError.message.includes('SRID')) {
      throw new ValidationError(`Invalid geometry: ${insertError.message}`, [
        { path: 'geom', message: insertError.message },
      ])
    }

    throw new DatabaseError(
      `Failed to create property: ${insertError.message}`,
      insertError,
      { property_no: propertyData.property_no }
    )
  }

  if (!property) {
    throw new DatabaseError('Property creation returned null', undefined, {
      property_no: propertyData.property_no,
    })
  }

  return property as Property
}

/**
 * Update property record
 * 
 * @param propertyId - Property ID
 * @param propertyData - Property data to update
 * @returns Updated property record
 */
export async function updateProperty(
  propertyId: string,
  propertyData: PropertyUpdate
): Promise<Property> {
  const supabase = await createClient()

  // Validate property data
  const validationResult = propertyUpdateSchema.safeParse(propertyData)
  if (!validationResult.success) {
    throw new ValidationError(
      'Property data validation failed',
      validationResult.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))
    )
  }

  // Check if property exists
  const { data: existing, error: checkError } = await supabase
    .from('ver_properties')
    .select('id')
    .eq('id', propertyId)
    .single()

  if (checkError || !existing) {
    throw new ValidationError(`Property not found: ${propertyId}`, [
      { path: 'id', message: 'Property does not exist' },
    ])
  }

  // Check for duplicate property_no if updating
  if (propertyData.property_no) {
    const { data: duplicate, error: dupError } = await supabase
      .from('ver_properties')
      .select('id')
      .eq('property_no', propertyData.property_no)
      .neq('id', propertyId)
      .single()

    if (duplicate) {
      throw new ValidationError(`Property number already exists: ${propertyData.property_no}`, [
        { path: 'property_no', message: 'Property number must be unique' },
      ])
    }
  }

  // Prepare update data
  const updateData: Record<string, unknown> = {}

  if (propertyData.property_no !== undefined) {
    updateData.property_no = propertyData.property_no
  }
  if (propertyData.address !== undefined) {
    updateData.address = propertyData.address
  }
  if (propertyData.geom !== undefined) {
    updateData.geom = propertyData.geom
  }
  if ((propertyData as any).owner_name !== undefined) {
    updateData.owner_name = (propertyData as any).owner_name
  }
  if ((propertyData as any).registration_date !== undefined) {
    updateData.registration_date = (propertyData as any).registration_date
  }
  if ((propertyData as any).status !== undefined) {
    updateData.status = (propertyData as any).status
  }
  if ((propertyData as any).metadata !== undefined) {
    updateData.metadata = (propertyData as any).metadata
  }

  // Update property record
  const { data: property, error: updateError } = await supabase
    .from('ver_properties')
    .update(updateData)
    .eq('id', propertyId)
    .select()
    .single()

  if (updateError) {
    // Handle specific PostGIS errors
    if (updateError.message.includes('geometry') || updateError.message.includes('SRID')) {
      throw new ValidationError(`Invalid geometry: ${updateError.message}`, [
        { path: 'geom', message: updateError.message },
      ])
    }

    throw new DatabaseError(
      `Failed to update property: ${updateError.message}`,
      updateError,
      { propertyId }
    )
  }

  if (!property) {
    throw new DatabaseError('Property update returned null', undefined, { propertyId })
  }

  return property as Property
}

/**
 * Get property by ID
 * 
 * @param propertyId - Property ID
 * @returns Property record or null
 */
export async function getProperty(propertyId: string): Promise<Property | null> {
  const supabase = await createClient()

  const { data: property, error } = await supabase
    .from('ver_properties')
    .select('*')
    .eq('id', propertyId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new DatabaseError(`Failed to get property: ${error.message}`, error, { propertyId })
  }

  return property as Property | null
}

/**
 * Get properties by property number
 * 
 * @param propertyNo - Property number
 * @returns Property record or null
 */
export async function getPropertyByNumber(propertyNo: string): Promise<Property | null> {
  const supabase = await createClient()

  const { data: property, error } = await supabase
    .from('ver_properties')
    .select('*')
    .eq('property_no', propertyNo)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new DatabaseError(`Failed to get property: ${error.message}`, error, { propertyNo })
  }

  return property as Property | null
}

/**
 * Delete property record
 * 
 * @param propertyId - Property ID
 * @returns True if deleted, false otherwise
 */
export async function deleteProperty(propertyId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase.from('ver_properties').delete().eq('id', propertyId)

  if (error) {
    throw new DatabaseError(`Failed to delete property: ${error.message}`, error, { propertyId })
  }

  return true
}

/**
 * Spatial query: Find properties containing a point
 * 
 * @param longitude - Point longitude
 * @param latitude - Point latitude
 * @returns Array of properties containing the point
 */
export async function findPropertiesContainingPoint(
  longitude: number,
  latitude: number
): Promise<Property[]> {
  const supabase = await createClient()

  const { data: properties, error } = await supabase.rpc('find_properties_containing_point', {
    point_longitude: longitude,
    point_latitude: latitude,
  })

  if (error) {
    throw new DatabaseError(
      `Failed to find properties containing point: ${error.message}`,
      error,
      { longitude, latitude }
    )
  }

  return (properties || []) as Property[]
}

/**
 * Spatial query: Find properties intersecting with a geometry
 * 
 * @param geometry - Geometry to intersect with (GeoJSON string or WKT string)
 * @returns Array of properties intersecting with the geometry
 */
export async function findPropertiesIntersecting(
  geometry: string
): Promise<Property[]> {
  const supabase = await createClient()

  // First, convert geometry to PostGIS format using RPC function
  // Try GeoJSON first, then WKT
  let geom: string | null = null

  try {
    // Try as GeoJSON
    const { data: geojsonGeom, error: geojsonError } = await supabase.rpc('geojson_to_geometry', {
      geojson_text: geometry,
      srid: 4326,
    })

    if (!geojsonError && geojsonGeom) {
      geom = geojsonGeom
    }
  } catch {
    // Not GeoJSON, try WKT
    try {
      const { data: wktGeom, error: wktError } = await supabase.rpc('wkt_to_geometry', {
        wkt_text: geometry,
        srid: 4326,
      })

      if (!wktError && wktGeom) {
        geom = wktGeom
      }
    } catch {
      throw new ValidationError('Invalid geometry format. Must be GeoJSON or WKT string', [
        { path: 'geometry', message: 'Invalid geometry format' },
      ])
    }
  }

  if (!geom) {
    throw new ValidationError('Failed to parse geometry', [
      { path: 'geometry', message: 'Could not parse geometry' },
    ])
  }

  const { data: properties, error } = await supabase.rpc('find_properties_intersecting', {
    search_geom: geom,
  })

  if (error) {
    throw new DatabaseError(
      `Failed to find properties intersecting: ${error.message}`,
      error,
      { geometry }
    )
  }

  return (properties || []) as Property[]
}

/**
 * Spatial query: Find properties within a geometry (ST_Within)
 * 
 * @param geometry - Geometry to check within (GeoJSON string or WKT string)
 * @returns Array of properties within the geometry
 */
export async function findPropertiesWithin(
  geometry: string
): Promise<Property[]> {
  const supabase = await createClient()

  // Convert geometry to PostGIS format
  let geom: string | null = null

  try {
    const { data: geojsonGeom, error: geojsonError } = await supabase.rpc('geojson_to_geometry', {
      geojson_text: geometry,
      srid: 4326,
    })

    if (!geojsonError && geojsonGeom) {
      geom = geojsonGeom
    }
  } catch {
    try {
      const { data: wktGeom, error: wktError } = await supabase.rpc('wkt_to_geometry', {
        wkt_text: geometry,
        srid: 4326,
      })

      if (!wktError && wktGeom) {
        geom = wktGeom
      }
    } catch {
      throw new ValidationError('Invalid geometry format. Must be GeoJSON or WKT string', [
        { path: 'geometry', message: 'Invalid geometry format' },
      ])
    }
  }

  if (!geom) {
    throw new ValidationError('Failed to parse geometry', [
      { path: 'geometry', message: 'Could not parse geometry' },
    ])
  }

  const { data: properties, error } = await supabase.rpc('find_properties_within', {
    search_geom: geom,
  })

  if (error) {
    throw new DatabaseError(
      `Failed to find properties within: ${error.message}`,
      error,
      { geometry }
    )
  }

  return (properties || []) as Property[]
}

/**
 * Spatial query: Find properties within a bounding box
 * 
 * @param minLng - Minimum longitude
 * @param minLat - Minimum latitude
 * @param maxLng - Maximum longitude
 * @param maxLat - Maximum latitude
 * @returns Array of properties within the bounding box
 */
export async function findPropertiesInBoundingBox(
  minLng: number,
  minLat: number,
  maxLng: number,
  maxLat: number
): Promise<Property[]> {
  const supabase = await createClient()

  const { data: properties, error } = await supabase.rpc('find_properties_in_bbox', {
    min_lng: minLng,
    min_lat: minLat,
    max_lng: maxLng,
    max_lat: maxLat,
  })

  if (error) {
    throw new DatabaseError(
      `Failed to find properties in bounding box: ${error.message}`,
      error,
      { minLng, minLat, maxLng, maxLat }
    )
  }

  return (properties || []) as Property[]
}

/**
 * Spatial query: Find properties within distance of a point
 * 
 * @param longitude - Point longitude
 * @param latitude - Point latitude
 * @param distanceMeters - Distance in meters
 * @returns Array of properties within the distance (with distance included)
 */
export async function findPropertiesWithinDistance(
  longitude: number,
  latitude: number,
  distanceMeters: number
): Promise<Array<Property & { distance_meters: number }>> {
  const supabase = await createClient()

  const { data: properties, error } = await supabase.rpc('find_properties_within_distance', {
    point_longitude: longitude,
    point_latitude: latitude,
    max_distance_meters: distanceMeters,
  })

  if (error) {
    throw new DatabaseError(
      `Failed to find properties within distance: ${error.message}`,
      error,
      { longitude, latitude, distanceMeters }
    )
  }

  return (properties || []) as Array<Property & { distance_meters: number }>
}

/**
 * Get properties with pagination and sorting
 * 
 * @param options - Pagination and sorting options
 * @returns Paginated properties and metadata
 */
export async function getProperties(options: {
  page?: number
  pageSize?: number
  sortBy?: 'created_at' | 'updated_at' | 'property_no' | 'address' | 'registration_date'
  sortOrder?: 'asc' | 'desc'
  status?: string
  search?: string
}): Promise<{
  properties: Property[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}> {
  const supabase = await createClient()

  const page = options.page || 1
  const pageSize = options.pageSize || 20
  const sortBy = options.sortBy || 'created_at'
  const sortOrder = options.sortOrder || 'desc'
  const offset = (page - 1) * pageSize

  // Build query
  let query = supabase.from('ver_properties').select('*', { count: 'exact' })

  // Apply filters
  if (options.status) {
    query = query.eq('status', options.status)
  }

  if (options.search) {
    // Search in property_no, address, and owner_name
    query = query.or(
      `property_no.ilike.%${options.search}%,address.ilike.%${options.search}%,owner_name.ilike.%${options.search}%`
    )
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortOrder === 'asc' })

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1)

  const { data: properties, error, count } = await query

  if (error) {
    throw new DatabaseError(`Failed to get properties: ${error.message}`, error, { options })
  }

  const total = count || 0
  const totalPages = Math.ceil(total / pageSize)

  return {
    properties: (properties || []) as Property[],
    total,
    page,
    pageSize,
    totalPages,
  }
}
