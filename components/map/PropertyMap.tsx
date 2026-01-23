'use client'

/**
 * Property Map Component
 * 
 * Interactive Leaflet map for displaying properties with filtering,
 * drawing tools, and property information popups.
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { FeatureCollection, Feature, Geometry } from 'geojson'
import type { Property } from '@/lib/types'

// Fix Leaflet default icon issue
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

/**
 * Map filter options
 */
export interface MapFilterOptions {
  documentStatus?: string
  startDate?: string
  endDate?: string
  bbox?: {
    minLng: number
    minLat: number
    maxLng: number
    maxLat: number
  }
}

/**
 * Base map type
 */
export type BaseMapType = 'osm' | 'satellite'

/**
 * Property Map Props
 */
export interface PropertyMapProps {
  initialCenter?: [number, number]
  initialZoom?: number
  baseMap?: BaseMapType
  filters?: MapFilterOptions
  onPropertyClick?: (property: Property) => void
  showDrawingTools?: boolean
  onDrawComplete?: (geometry: Geometry) => void
  height?: string
}

/**
 * Component to update map bounds when filters change
 */
function MapBoundsUpdater({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap()

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds)
    }
  }, [bounds, map])

  return null
}

/**
 * Component to handle map click events
 */
function MapClickHandler({ onDrawComplete }: { onDrawComplete?: (geometry: Geometry) => void }) {
  useMapEvents({
    click(e) {
      // Handle map click if needed
    },
  })

  return null
}

/**
 * Drawing tools component
 */
function DrawingTools({ onDrawComplete }: { onDrawComplete?: (geometry: Geometry) => void }) {
  const map = useMap()
  const drawRef = useRef<L.Control.Draw | null>(null)

  useEffect(() => {
    if (!map) return

    // Initialize drawing tools
    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
        },
        rectangle: {
          showArea: true,
        },
        circle: false,
        marker: false,
        circlemarker: false,
        polyline: false,
      },
      edit: {
        featureGroup: new L.FeatureGroup(),
        remove: true,
      },
    })

    map.addControl(drawControl)
    drawRef.current = drawControl

    // Handle draw events
    const handleDrawCreated = (e: L.DrawEvents.Created) => {
      const layer = e.layer
      const geoJSON = layer.toGeoJSON()

      if (onDrawComplete && geoJSON.geometry) {
        onDrawComplete(geoJSON.geometry)
      }

      // Add to map
      const drawnItems = new L.FeatureGroup()
      drawnItems.addLayer(layer)
      map.addLayer(drawnItems)
    }

    map.on(L.Draw.Event.CREATED, handleDrawCreated)

    return () => {
      if (drawRef.current) {
        map.removeControl(drawRef.current)
      }
      map.off(L.Draw.Event.CREATED, handleDrawCreated)
    }
  }, [map, onDrawComplete])

  return null
}

/**
 * Property popup content
 */
function PropertyPopup({ property }: { property: Property }) {
  return (
    <div className="property-popup p-2 min-w-[200px]">
      <h3 className="font-semibold text-lg mb-2">{property.property_no}</h3>
      <div className="space-y-1 text-sm">
        <p>
          <span className="font-medium">Address:</span> {property.address}
        </p>
        {property.owner_name && (
          <p>
            <span className="font-medium">Owner:</span> {property.owner_name}
          </p>
        )}
        {property.area && (
          <p>
            <span className="font-medium">Area:</span> {property.area.toLocaleString()} m²
          </p>
        )}
        {property.registration_date && (
          <p>
            <span className="font-medium">Registered:</span>{' '}
            {new Date(property.registration_date).toLocaleDateString()}
          </p>
        )}
        <p>
          <span className="font-medium">Status:</span> {property.status}
        </p>
      </div>
      <div className="mt-3 pt-3 border-t">
        <a
          href={`/properties/${property.id}`}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          View Details →
        </a>
      </div>
    </div>
  )
}

/**
 * Main Property Map Component
 */
export default function PropertyMap({
  initialCenter = [0, 0],
  initialZoom = 2,
  baseMap = 'osm',
  filters,
  onPropertyClick,
  showDrawingTools = false,
  onDrawComplete,
  height = '600px',
}: PropertyMapProps) {
  const [properties, setProperties] = useState<FeatureCollection | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null)

  // Fetch properties from gis-layers Edge Function
  const fetchProperties = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()

      if (filters?.documentStatus) {
        params.append('document_status', filters.documentStatus)
      }

      if (filters?.startDate) {
        params.append('start_date', filters.startDate)
      }

      if (filters?.endDate) {
        params.append('end_date', filters.endDate)
      }

      if (filters?.bbox) {
        params.append('bbox_min_lng', filters.bbox.minLng.toString())
        params.append('bbox_min_lat', filters.bbox.minLat.toString())
        params.append('bbox_max_lng', filters.bbox.maxLng.toString())
        params.append('bbox_max_lat', filters.bbox.maxLat.toString())
      }

      // Get Supabase URL from environment
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (!supabaseUrl) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
      }

      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/gis-layers?${params.toString()}`

      const response = await fetch(edgeFunctionUrl, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch properties: ${response.statusText}`)
      }

      const data = await response.json()
      setProperties(data as FeatureCollection)

      // Calculate bounds if properties exist
      if (data.features && data.features.length > 0) {
        const geoJSONLayer = L.geoJSON(data as FeatureCollection)
        const calculatedBounds = geoJSONLayer.getBounds()
        if (calculatedBounds.isValid()) {
          setBounds(calculatedBounds)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load properties')
      console.error('Error fetching properties:', err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  // Fetch properties when filters change
  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])

  // Handle property click
  const handlePropertyClick = useCallback(
    (feature: Feature) => {
      if (onPropertyClick && feature.properties) {
        // Convert feature properties to Property type
        const property: Property = {
          id: feature.properties.id || '',
          property_no: feature.properties.property_no || '',
          address: feature.properties.address || '',
          owner_name: feature.properties.owner_name || null,
          area: feature.properties.area || null,
          registration_date: feature.properties.registration_date || null,
          status: feature.properties.status || 'active',
          metadata: feature.properties.metadata || {},
          created_at: feature.properties.created_at || new Date().toISOString(),
          updated_at: feature.properties.updated_at || new Date().toISOString(),
        }
        onPropertyClick(property)
      }
    },
    [onPropertyClick]
  )

  // Style function for properties
  const styleProperty = useCallback((feature: Feature) => {
    const status = feature.properties?.status || 'active'
    const colors: Record<string, string> = {
      active: '#22c55e',
      inactive: '#ef4444',
      pending: '#f59e0b',
      archived: '#6b7280',
    }

    return {
      fillColor: colors[status] || '#3b82f6',
      fillOpacity: 0.6,
      color: colors[status] || '#3b82f6',
      weight: 2,
      opacity: 0.8,
    }
  }, [])

  // Get tile layer URL based on base map type
  const getTileLayerUrl = () => {
    switch (baseMap) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      case 'osm':
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    }
  }

  // Get tile layer attribution
  const getTileLayerAttribution = () => {
    switch (baseMap) {
      case 'satellite':
        return '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      case 'osm':
      default:
        return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
  }

  return (
    <div className="property-map-container w-full" style={{ height }}>
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-[1000]">
          <div className="text-lg">Loading properties...</div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 bg-red-50 bg-opacity-75 flex items-center justify-center z-[1000]">
          <div className="text-lg text-red-600">Error: {error}</div>
        </div>
      )}

      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer url={getTileLayerUrl()} attribution={getTileLayerAttribution()} />

        {properties && (
          <GeoJSON
            data={properties}
            style={styleProperty}
            onEachFeature={(feature, layer) => {
              if (feature.properties) {
                const popupContent = <PropertyPopup property={feature.properties as any} />
                layer.bindPopup(() => popupContent)

                layer.on({
                  click: () => handlePropertyClick(feature),
                })
              }
            }}
          />
        )}

        {showDrawingTools && <DrawingTools onDrawComplete={onDrawComplete} />}
        <MapBoundsUpdater bounds={bounds} />
        <MapClickHandler onDrawComplete={onDrawComplete} />
      </MapContainer>
    </div>
  )
}
