/**
 * GIS Layers Edge Function
 * 
 * Supabase Edge Function to serve property data as GeoJSON FeatureCollections
 * for mapping functionality with spatial filtering and document status filtering.
 * 
 * Uses Deno runtime with PostGIS ST_AsGeoJSON for geometry conversion.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// Initialize Supabase client with service role key for database operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * CORS headers for cross-origin requests
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

/**
 * Cache headers for GeoJSON responses
 */
const cacheHeaders = {
  'Cache-Control': 'public, max-age=300', // 5 minutes cache
  'Vary': 'Origin',
}

/**
 * Create error response with CORS headers
 */
function createErrorResponse(
  status: number,
  message: string,
  details?: Record<string, unknown>
): Response {
  return new Response(
    JSON.stringify({
      error: message,
      ...details,
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  )
}

/**
 * Create success response with CORS and cache headers
 */
function createSuccessResponse(data: unknown, cache: boolean = true): Response {
  return new Response(
    JSON.stringify(data),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/geo+json',
        ...(cache ? cacheHeaders : {}),
      },
    }
  )
}

/**
 * Validate environment variables
 */
function validateEnvironment(): { valid: boolean; error?: string } {
  if (!SUPABASE_URL) {
    return { valid: false, error: 'SUPABASE_URL environment variable is not set' }
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return { valid: false, error: 'SUPABASE_SERVICE_ROLE_KEY environment variable is not set' }
  }

  return { valid: true }
}

/**
 * Parse and validate bounding box parameters
 */
function parseBoundingBox(params: URLSearchParams): {
  valid: boolean
  error?: string
  bbox?: { minLng: number; minLat: number; maxLng: number; maxLat: number }
} {
  const minLng = params.get('bbox_min_lng')
  const minLat = params.get('bbox_min_lat')
  const maxLng = params.get('bbox_max_lng')
  const maxLat = params.get('bbox_max_lat')

  // Bounding box is optional - if any parameter is missing, return valid with no bbox
  if (!minLng || !minLat || !maxLng || !maxLat) {
    return { valid: true } // No bounding box filter
  }

  const minLngNum = parseFloat(minLng)
  const minLatNum = parseFloat(minLat)
  const maxLngNum = parseFloat(maxLng)
  const maxLatNum = parseFloat(maxLat)

  if (
    isNaN(minLngNum) ||
    isNaN(minLatNum) ||
    isNaN(maxLngNum) ||
    isNaN(maxLatNum)
  ) {
    return { valid: false, error: 'Invalid bounding box coordinates' }
  }

  if (minLngNum >= maxLngNum || minLatNum >= maxLatNum) {
    return { valid: false, error: 'Invalid bounding box: min must be less than max' }
  }

  if (
    minLngNum < -180 ||
    minLngNum > 180 ||
    maxLngNum < -180 ||
    maxLngNum > 180 ||
    minLatNum < -90 ||
    minLatNum > 90 ||
    maxLatNum < -90 ||
    maxLatNum > 90
  ) {
    return { valid: false, error: 'Bounding box coordinates out of valid range' }
  }

  return {
    valid: true,
    bbox: {
      minLng: minLngNum,
      minLat: minLatNum,
      maxLng: maxLngNum,
      maxLat: maxLatNum,
    },
  }
}

/**
 * Parse and validate date range parameters
 */
function parseDateRange(params: URLSearchParams): {
  valid: boolean
  error?: string
  dateRange?: { startDate: string; endDate: string }
} {
  const startDate = params.get('start_date')
  const endDate = params.get('end_date')

  if (!startDate && !endDate) {
    return { valid: true } // Date range is optional
  }

  if (startDate && !endDate) {
    return { valid: false, error: 'end_date is required when start_date is provided' }
  }

  if (!startDate && endDate) {
    return { valid: false, error: 'start_date is required when end_date is provided' }
  }

  // Validate date format (ISO 8601: YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(startDate!) || !dateRegex.test(endDate!)) {
    return { valid: false, error: 'Invalid date format. Use YYYY-MM-DD' }
  }

  const start = new Date(startDate!)
  const end = new Date(endDate!)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, error: 'Invalid date values' }
  }

  if (start > end) {
    return { valid: false, error: 'start_date must be before or equal to end_date' }
  }

  return {
    valid: true,
    dateRange: {
      startDate: startDate!,
      endDate: endDate!,
    },
  }
}

/**
 * Validate document status parameter
 */
function validateDocumentStatus(status: string | null): {
  valid: boolean
  error?: string
  status?: string
} {
  if (!status) {
    return { valid: true } // Status is optional
  }

  const validStatuses = ['pending', 'hashed', 'verified', 'rejected', 'flagged']
  if (!validStatuses.includes(status)) {
    return {
      valid: false,
      error: `Invalid document status. Must be one of: ${validStatuses.join(', ')}`,
    }
  }

  return { valid: true, status }
}

/**
 * Convert properties to GeoJSON FeatureCollection
 */
function propertiesToGeoJSON(properties: Array<Record<string, unknown>>): {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    geometry: unknown
    properties: Record<string, unknown>
  }>
} {
  const features = properties
    .filter((prop) => prop.geom !== null && prop.geom !== undefined)
    .map((prop) => {
      // Extract geometry (should already be GeoJSON from ST_AsGeoJSON)
      let geometry: unknown = prop.geom

      // If geometry is a string, try to parse it as JSON (ST_AsGeoJSON returns JSON string)
      if (typeof geometry === 'string') {
        try {
          geometry = JSON.parse(geometry)
        } catch {
          // If parsing fails, geometry might already be an object
          // or it's invalid - skip this property
          return null
        }
      }

      // Create feature properties (exclude geometry from properties)
      const { geom, ...featureProperties } = prop

      return {
        type: 'Feature' as const,
        geometry,
        properties: featureProperties,
      }
    })
    .filter((feature) => feature !== null) as Array<{
      type: 'Feature'
      geometry: unknown
      properties: Record<string, unknown>
    }>

  return {
    type: 'FeatureCollection',
    features,
  }
}

/**
 * Get properties as GeoJSON with filtering
 */
async function getPropertiesAsGeoJSON(options: {
  documentStatus?: string
  startDate?: string
  endDate?: string
  bbox?: { minLng: number; minLat: number; maxLng: number; maxLat: number }
}): Promise<{
  type: 'FeatureCollection'
  features: Array<unknown>
}> {
  // Use RPC function to get properties with GeoJSON conversion
  const { data: properties, error } = await supabase.rpc('get_properties_geojson', {
    document_status_filter: options.documentStatus || null,
    start_date_filter: options.startDate || null,
    end_date_filter: options.endDate || null,
    bbox_min_lng: options.bbox?.minLng || null,
    bbox_min_lat: options.bbox?.minLat || null,
    bbox_max_lng: options.bbox?.maxLng || null,
    bbox_max_lat: options.bbox?.maxLat || null,
  })

  if (error) {
    throw new Error(`Failed to query properties: ${error.message}`)
  }

  // Properties already have geometry as GeoJSON (from ST_AsGeoJSON)
  return propertiesToGeoJSON((properties || []) as Array<Record<string, unknown>>)
}

/**
 * Handle OPTIONS request for CORS preflight
 */
function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  })
}

/**
 * Main handler for gis-layers Edge Function
 */
Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleOptions()
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return createErrorResponse(405, 'Method not allowed. Only GET is supported.')
  }

  try {
    // Validate environment
    const envValidation = validateEnvironment()
    if (!envValidation.valid) {
      console.error('Environment validation failed:', envValidation.error)
      return createErrorResponse(500, envValidation.error || 'Environment validation failed')
    }

    // Parse query parameters
    const url = new URL(req.url)
    const params = url.searchParams

    // Parse and validate bounding box
    const bboxValidation = parseBoundingBox(params)
    if (!bboxValidation.valid) {
      return createErrorResponse(400, bboxValidation.error || 'Invalid bounding box parameters')
    }

    // Parse and validate date range
    const dateRangeValidation = parseDateRange(params)
    if (!dateRangeValidation.valid) {
      return createErrorResponse(400, dateRangeValidation.error || 'Invalid date range parameters')
    }

    // Validate document status
    const statusValidation = validateDocumentStatus(params.get('document_status'))
    if (!statusValidation.valid) {
      return createErrorResponse(400, statusValidation.error || 'Invalid document status')
    }

    // Get properties as GeoJSON
    const geoJSON = await getPropertiesAsGeoJSON({
      documentStatus: statusValidation.status || undefined,
      startDate: dateRangeValidation.dateRange?.startDate,
      endDate: dateRangeValidation.dateRange?.endDate,
      bbox: bboxValidation.bbox,
    })

    // Determine cache control
    const noCache = params.get('no_cache') === 'true'
    const cache = !noCache

    return createSuccessResponse(geoJSON, cache)
  } catch (error) {
    console.error('Error in gis-layers function:', error)
    return createErrorResponse(
      500,
      'Internal server error',
      {
        message: error instanceof Error ? error.message : String(error),
      }
    )
  }
})
