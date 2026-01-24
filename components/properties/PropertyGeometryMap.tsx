'use client'

/**
 * Property Geometry Map
 *
 * Renders a Leaflet map with a single property geometry (GeoJSON).
 * Used on the property detail page.
 */

import { useEffect } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Feature, Geometry } from 'geojson'

if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

function FitBounds({ geometry }: { geometry: Geometry }) {
  const map = useMap()
  const feature: Feature = { type: 'Feature', geometry, properties: {} }
  useEffect(() => {
    try {
      const layer = L.geoJSON(feature)
      const bounds = layer.getBounds()
      if (bounds.isValid()) map.fitBounds(bounds, { maxZoom: 16, padding: [24, 24] })
    } catch {
      /* ignore */
    }
  }, [map, geometry])
  return null
}

export interface PropertyGeometryMapProps {
  geometry: Geometry | null
  className?: string
  height?: string
}

export default function PropertyGeometryMap({
  geometry,
  className = '',
  height = '400px',
}: PropertyGeometryMapProps) {
  if (!geometry) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 ${className}`}
        style={{ height }}
      >
        <span className="text-sm text-gray-500">No geometry</span>
      </div>
    )
  }

  const feature: Feature = { type: 'Feature', geometry, properties: {} }

  return (
    <div className={`rounded-lg overflow-hidden border border-gray-200 ${className}`} style={{ height }}>
      <MapContainer
        center={[0, 0]}
        zoom={2}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <GeoJSON
          data={feature}
          style={{ fillColor: '#3b82f6', fillOpacity: 0.5, color: '#2563eb', weight: 2 }}
        />
        <FitBounds geometry={geometry} />
      </MapContainer>
    </div>
  )
}
