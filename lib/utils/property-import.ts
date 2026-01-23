/**
 * Property Import Utilities
 * 
 * Utilities for parsing and validating property import data from CSV/JSON files
 * with support for multiple geometry formats (WKT, GeoJSON, coordinate pairs).
 */

import { ValidationError } from '@/lib/errors'
import { propertyInsertSchema } from '@/lib/validation'
import type { PropertyInsert } from '@/lib/types'

/**
 * Geometry format types
 */
export type GeometryFormat = 'wkt' | 'geojson' | 'coordinates'

/**
 * Parsed property import record
 */
export interface ParsedPropertyRecord {
  property_no: string
  address: string
  owner_name?: string | null
  geom?: string | { type: string; coordinates: unknown } | null
  registration_date?: string | null
  status?: 'active' | 'inactive' | 'pending' | 'archived'
  metadata?: Record<string, unknown>
  rowNumber?: number
  rawData?: Record<string, unknown>
}

/**
 * Import result for a single property
 */
export interface PropertyImportResult {
  success: boolean
  property_no?: string
  property_id?: string
  error?: string
  errorCode?: string
  rowNumber?: number
}

/**
 * Bulk import result
 */
export interface BulkImportResult {
  total: number
  successful: number
  failed: number
  skipped: number
  results: PropertyImportResult[]
  errors: Array<{
    rowNumber: number
    property_no?: string
    error: string
    errorCode: string
  }>
  importId: string
  durationMs: number
}

/**
 * Parse coordinate pairs to WKT POLYGON
 * 
 * Expected format: "lng1,lat1;lng2,lat2;lng3,lat3;..." or array of [lng, lat] pairs
 */
export function parseCoordinatePairs(
  coords: string | Array<[number, number]> | Array<number>
): string {
  let coordinates: Array<[number, number]> = []

  if (typeof coords === 'string') {
    // Parse string format: "lng1,lat1;lng2,lat2;..." or "lng1,lat1 lng2,lat2 ..."
    const parts = coords.split(/[;\s]+/).filter((p) => p.trim())
    coordinates = parts.map((part) => {
      const [lng, lat] = part.split(',').map((c) => parseFloat(c.trim()))
      if (isNaN(lng) || isNaN(lat)) {
        throw new ValidationError(`Invalid coordinate pair: ${part}`, [
          { path: 'coordinates', message: 'Invalid coordinate format' },
        ])
      }
      return [lng, lat] as [number, number]
    })
  } else if (Array.isArray(coords)) {
    // Check if it's array of [lng, lat] pairs or flat array [lng1, lat1, lng2, lat2, ...]
    if (coords.length > 0 && Array.isArray(coords[0])) {
      // Array of pairs
      coordinates = coords as Array<[number, number]>
    } else {
      // Flat array - convert to pairs
      const flat = coords as number[]
      if (flat.length % 2 !== 0) {
        throw new ValidationError('Coordinate array must have even number of elements', [
          { path: 'coordinates', message: 'Invalid coordinate array length' },
        ])
      }
      for (let i = 0; i < flat.length; i += 2) {
        coordinates.push([flat[i], flat[i + 1]])
      }
    }
  }

  if (coordinates.length < 3) {
    throw new ValidationError('Polygon must have at least 3 coordinate pairs', [
      { path: 'coordinates', message: 'Insufficient coordinates for polygon' },
    ])
  }

  // Close the polygon if not already closed
  if (
    coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
    coordinates[0][1] !== coordinates[coordinates.length - 1][1]
  ) {
    coordinates.push(coordinates[0])
  }

  // Create WKT POLYGON
  const coordString = coordinates.map(([lng, lat]) => `${lng} ${lat}`).join(', ')
  return `POLYGON((${coordString}))`
}

/**
 * Parse geometry from various formats
 */
export function parseGeometry(
  geom: string | { type: string; coordinates: unknown } | Array<[number, number]> | Array<number> | null | undefined,
  format?: GeometryFormat
): string | { type: string; coordinates: unknown } | null {
  if (!geom) {
    return null
  }

  // Auto-detect format if not specified
  if (!format) {
    if (typeof geom === 'string') {
      // Check if WKT
      const wktPattern = /^(POINT|LINESTRING|POLYGON|MULTIPOINT|MULTILINESTRING|MULTIPOLYGON)\s*\(/i
      if (wktPattern.test(geom.trim())) {
        format = 'wkt'
      } else {
        // Try to parse as GeoJSON string
        try {
          const parsed = JSON.parse(geom)
          if (parsed.type && parsed.coordinates) {
            format = 'geojson'
            geom = parsed
          } else {
            format = 'coordinates'
          }
        } catch {
          format = 'coordinates'
        }
      }
    } else if (Array.isArray(geom)) {
      format = 'coordinates'
    } else if (typeof geom === 'object' && geom !== null && 'type' in geom && 'coordinates' in geom) {
      format = 'geojson'
    }
  }

  // Parse based on format
  switch (format) {
    case 'wkt':
      if (typeof geom !== 'string') {
        throw new ValidationError('WKT geometry must be a string', [
          { path: 'geom', message: 'Invalid WKT format' },
        ])
      }
      return geom.trim()

    case 'geojson':
      if (typeof geom === 'string') {
        try {
          return JSON.parse(geom) as { type: string; coordinates: unknown }
        } catch {
          throw new ValidationError('Invalid GeoJSON string', [
            { path: 'geom', message: 'Could not parse GeoJSON' },
          ])
        }
      }
      if (typeof geom === 'object' && geom !== null && 'type' in geom && 'coordinates' in geom) {
        return geom as { type: string; coordinates: unknown }
      }
      throw new ValidationError('Invalid GeoJSON format', [
        { path: 'geom', message: 'GeoJSON must have type and coordinates' },
      ])

    case 'coordinates':
      try {
        const wkt = parseCoordinatePairs(geom as string | Array<[number, number]> | Array<number>)
        return wkt
      } catch (error) {
        if (error instanceof ValidationError) {
          throw error
        }
        throw new ValidationError('Failed to parse coordinates', [
          { path: 'geom', message: error instanceof Error ? error.message : 'Invalid coordinates' },
        ])
      }

    default:
      throw new ValidationError(`Unknown geometry format: ${format}`, [
        { path: 'geom', message: 'Unsupported geometry format' },
      ])
  }
}

/**
 * Parse CSV file content
 */
export function parseCSV(csvContent: string): Array<Record<string, string>> {
  const lines = csvContent.split('\n').filter((line) => line.trim())
  if (lines.length === 0) {
    return []
  }

  // Parse header
  const header = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  const records: Array<Record<string, string>> = []

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
    if (values.length !== header.length) {
      continue // Skip malformed rows
    }

    const record: Record<string, string> = {}
    for (let j = 0; j < header.length; j++) {
      record[header[j]] = values[j] || ''
    }
    records.push(record)
  }

  return records
}

/**
 * Parse JSON file content
 */
export function parseJSON(jsonContent: string): Array<Record<string, unknown>> {
  try {
    const parsed = JSON.parse(jsonContent)

    // Handle both array and single object
    if (Array.isArray(parsed)) {
      return parsed
    } else if (typeof parsed === 'object' && parsed !== null) {
      return [parsed]
    }

    throw new ValidationError('JSON must be an object or array of objects', [
      { path: 'data', message: 'Invalid JSON structure' },
    ])
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    throw new ValidationError('Invalid JSON format', [
      { path: 'data', message: error instanceof Error ? error.message : 'JSON parse error' },
    ])
  }
}

/**
 * Convert parsed record to PropertyInsert
 */
export function convertToPropertyInsert(
  record: Record<string, unknown>,
  rowNumber?: number
): PropertyInsert {
  const property: PropertyInsert = {
    property_no: String(record.property_no || record.propertyNo || record.property_number || ''),
    address: String(record.address || ''),
  }

  // Optional fields
  if (record.owner_name || record.ownerName || record.owner) {
    property.owner_name = String(record.owner_name || record.ownerName || record.owner)
  }

  if (record.registration_date || record.registrationDate || record.registered_date) {
    property.registration_date = String(record.registration_date || record.registrationDate || record.registered_date)
  }

  if (record.status) {
    property.status = String(record.status) as 'active' | 'inactive' | 'pending' | 'archived'
  }

  if (record.metadata) {
    if (typeof record.metadata === 'string') {
      try {
        property.metadata = JSON.parse(record.metadata)
      } catch {
        property.metadata = {}
      }
    } else if (typeof record.metadata === 'object') {
      property.metadata = record.metadata as Record<string, unknown>
    }
  }

  // Parse geometry
  const geomField = record.geom || record.geometry || record.wkt || record.geojson || record.coordinates
  if (geomField) {
    try {
      // Try to detect format
      let format: GeometryFormat | undefined

      if (record.geom_format || record.geometryFormat) {
        format = String(record.geom_format || record.geometryFormat).toLowerCase() as GeometryFormat
      } else if (record.wkt) {
        format = 'wkt'
      } else if (record.geojson) {
        format = 'geojson'
      } else if (record.coordinates) {
        format = 'coordinates'
      }

      property.geom = parseGeometry(geomField, format)
    } catch (error) {
      throw new ValidationError(
        `Row ${rowNumber || 'unknown'}: Invalid geometry - ${error instanceof Error ? error.message : 'Unknown error'}`,
        [{ path: 'geom', message: 'Geometry parsing failed' }]
      )
    }
  }

  return property
}

/**
 * Validate property insert data
 */
export function validatePropertyRecord(property: PropertyInsert, rowNumber?: number): {
  valid: boolean
  error?: string
} {
  try {
    const validationResult = propertyInsertSchema.safeParse(property)
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => issue.message).join(', ')
      return {
        valid: false,
        error: `Row ${rowNumber || 'unknown'}: ${errors}`,
      }
    }
    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: `Row ${rowNumber || 'unknown'}: ${error instanceof Error ? error.message : 'Validation error'}`,
    }
  }
}
