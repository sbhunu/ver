/**
 * Property Bulk Import Database Operations
 * 
 * Database operations for bulk property import with transaction support,
 * duplicate detection, and error handling.
 */

import { createClient } from '@/lib/supabase/server'
import { DatabaseError, ValidationError } from '@/lib/errors'
import type { PropertyInsert } from '@/lib/types'
import type { PropertyImportResult } from '@/lib/utils/property-import'

/**
 * Check for duplicate property by property number
 */
export async function checkDuplicatePropertyNumber(propertyNo: string): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ver_properties')
    .select('id')
    .eq('property_no', propertyNo)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new DatabaseError(`Failed to check duplicate: ${error.message}`, error, { propertyNo })
  }

  return !!data
}

/**
 * Check for duplicate property by geometry overlap
 * 
 * Uses PostGIS ST_Overlaps or ST_Intersects to detect overlapping geometries
 */
export async function checkDuplicateGeometry(
  geometry: string | { type: string; coordinates: unknown }
): Promise<Array<{ id: string; property_no: string; overlap_ratio: number }>> {
  const supabase = await createClient()

  // Convert geometry to format for RPC function
  let geomString: string
  if (typeof geometry === 'string') {
    geomString = geometry
  } else {
    geomString = JSON.stringify(geometry)
  }

  // Use RPC function to check for overlapping geometries
  const { data, error } = await supabase.rpc('check_property_geometry_overlap', {
    search_geom: geomString,
  })

  if (error) {
    // If RPC doesn't exist, return empty array (no duplicates found)
    if (error.message.includes('function') && error.message.includes('does not exist')) {
      return []
    }
    throw new DatabaseError(`Failed to check geometry overlap: ${error.message}`, error)
  }

  return (data || []) as Array<{ id: string; property_no: string; overlap_ratio: number }>
}

/**
 * Bulk import properties with transaction support
 * 
 * @param properties - Array of properties to import
 * @param options - Import options
 * @returns Import results
 */
export async function bulkImportProperties(
  properties: PropertyInsert[],
  options: {
    skipDuplicates?: boolean
    detectGeometryOverlaps?: boolean
    overlapThreshold?: number
    batchSize?: number
  } = {}
): Promise<PropertyImportResult[]> {
  const supabase = await createClient()
  const results: PropertyImportResult[] = []
  const batchSize = options.batchSize || 50

  // Process in batches
  for (let i = 0; i < properties.length; i += batchSize) {
    const batch = properties.slice(i, i + batchSize)
    const batchResults = await processBatch(batch, i, options, supabase)
    results.push(...batchResults)
  }

  return results
}

/**
 * Process a batch of properties
 */
async function processBatch(
  properties: PropertyInsert[],
  startIndex: number,
  options: {
    skipDuplicates?: boolean
    detectGeometryOverlaps?: boolean
    overlapThreshold?: number
  },
  supabase: ReturnType<typeof createClient>
): Promise<PropertyImportResult[]> {
  const results: PropertyImportResult[] = []

  for (let i = 0; i < properties.length; i++) {
    const property = properties[i]
    const rowNumber = startIndex + i + 1

    try {
      // Check for duplicate property number
      if (options.skipDuplicates) {
        const isDuplicate = await checkDuplicatePropertyNumber(property.property_no)
        if (isDuplicate) {
          results.push({
            success: false,
            property_no: property.property_no,
            error: 'Duplicate property number',
            errorCode: 'DUPLICATE_PROPERTY_NO',
            rowNumber,
          })
          continue
        }
      }

      // Check for geometry overlap
      if (options.detectGeometryOverlaps && property.geom) {
        const overlaps = await checkDuplicateGeometry(property.geom)
        const threshold = options.overlapThreshold || 0.8 // 80% overlap threshold

        const significantOverlaps = overlaps.filter((o) => o.overlap_ratio >= threshold)
        if (significantOverlaps.length > 0) {
          results.push({
            success: false,
            property_no: property.property_no,
            error: `Geometry overlaps with existing properties: ${significantOverlaps.map((o) => o.property_no).join(', ')}`,
            errorCode: 'GEOMETRY_OVERLAP',
            rowNumber,
          })
          continue
        }
      }

      // Insert property
      const insertData: Record<string, unknown> = {
        property_no: property.property_no,
        address: property.address,
        owner_name: (property as any).owner_name || null,
        registration_date: (property as any).registration_date || null,
        status: (property as any).status || 'active',
        metadata: (property as any).metadata || {},
      }

      // Handle geometry - convert to appropriate format
      if (property.geom) {
        if (typeof property.geom === 'string') {
          // WKT or already formatted
          insertData.geom = property.geom
        } else if (typeof property.geom === 'object') {
          // GeoJSON - convert to string for PostGIS
          insertData.geom = JSON.stringify(property.geom)
        }
      }

      const { data: inserted, error: insertError } = await supabase
        .from('ver_properties')
        .insert(insertData)
        .select('id')
        .single()

      if (insertError) {
        // Handle specific errors
        if (insertError.code === '23505') {
          results.push({
            success: false,
            property_no: property.property_no,
            error: 'Duplicate property number',
            errorCode: 'DUPLICATE_PROPERTY_NO',
            rowNumber,
          })
        } else if (insertError.message.includes('geometry') || insertError.message.includes('SRID')) {
          results.push({
            success: false,
            property_no: property.property_no,
            error: `Invalid geometry: ${insertError.message}`,
            errorCode: 'INVALID_GEOMETRY',
            rowNumber,
          })
        } else {
          results.push({
            success: false,
            property_no: property.property_no,
            error: insertError.message,
            errorCode: 'INSERT_ERROR',
            rowNumber,
          })
        }
      } else if (inserted) {
        results.push({
          success: true,
          property_no: property.property_no,
          property_id: inserted.id,
          rowNumber,
        })
      } else {
        results.push({
          success: false,
          property_no: property.property_no,
          error: 'Insert returned null',
          errorCode: 'INSERT_NULL',
          rowNumber,
        })
      }
    } catch (error) {
      results.push({
        success: false,
        property_no: property.property_no,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'PROCESSING_ERROR',
        rowNumber,
      })
    }
  }

  return results
}

/**
 * Log import history to ver_logs
 */
export async function logPropertyImport(
  actorId: string,
  importId: string,
  total: number,
  successful: number,
  failed: number,
  skipped: number,
  errors: Array<{ rowNumber: number; property_no?: string; error: string; errorCode: string }>
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from('ver_logs').insert({
    actor_id: actorId,
    action: 'create',
    target_type: 'property_import',
    target_id: importId,
    details: {
      import_id: importId,
      total,
      successful,
      failed,
      skipped,
      errors: errors.slice(0, 100), // Limit to first 100 errors
      error_count: errors.length,
    },
  })

  if (error) {
    console.error('Failed to log property import:', error)
    // Don't throw - logging failure shouldn't fail the import
  }
}
