'use client'

/**
 * Map Controls Component
 * 
 * Controls for base map selection and layer toggles
 */

import { useState } from 'react'
import type { BaseMapType } from './PropertyMap'

export interface MapControlsProps {
  baseMap: BaseMapType
  onBaseMapChange: (baseMap: BaseMapType) => void
  showFilters?: boolean
  onToggleFilters?: () => void
}

export default function MapControls({
  baseMap,
  onBaseMapChange,
  showFilters = false,
  onToggleFilters,
}: MapControlsProps) {
  return (
    <div className="map-controls bg-white p-3 rounded-lg shadow-lg border border-gray-200">
      <div className="flex flex-col gap-3">
        {/* Base Map Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Base Map</label>
          <div className="flex gap-2">
            <button
              onClick={() => onBaseMapChange('osm')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                baseMap === 'osm'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              OpenStreetMap
            </button>
            <button
              onClick={() => onBaseMapChange('satellite')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                baseMap === 'satellite'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Satellite
            </button>
          </div>
        </div>

        {/* Filters Toggle */}
        {onToggleFilters && (
          <button
            onClick={onToggleFilters}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              showFilters
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        )}
      </div>
    </div>
  )
}
