'use client'

/**
 * Analytics Map Component
 * 
 * GIS map integration with property data and verification status indicators
 */

import { useState, useEffect } from 'react'
import PropertyMap, { type MapFilterOptions, type BaseMapType } from '@/components/map/PropertyMap'
import MapFilters from '@/components/map/MapFilters'
import MapControls from '@/components/map/MapControls'
import type { Property } from '@/lib/types'

export interface AnalyticsMapProps {
  height?: string
}

export default function AnalyticsMap({ height = '600px' }: AnalyticsMapProps) {
  const [filters, setFilters] = useState<MapFilterOptions>({})
  const [baseMap, setBaseMap] = useState<BaseMapType>('osm')
  const [showFilters, setShowFilters] = useState(true)

  return (
    <div className="analytics-map bg-white rounded-lg shadow border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Property Map</h2>
        <div className="flex gap-2">
          <MapControls
            baseMap={baseMap}
            onBaseMapChange={setBaseMap}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
          />
        </div>
      </div>

      <div className="flex gap-4">
        {/* Filters Sidebar */}
        {showFilters && (
          <div className="w-64 flex-shrink-0">
            <MapFilters filters={filters} onFiltersChange={setFilters} />
          </div>
        )}

        {/* Map */}
        <div className="flex-1" style={{ height }}>
          <PropertyMap
            initialCenter={[0, 0]}
            initialZoom={2}
            baseMap={baseMap}
            filters={filters}
            showDrawingTools={true}
            height={height}
          />
        </div>
      </div>
    </div>
  )
}
