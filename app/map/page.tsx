/**
 * Property Map Page
 * 
 * Interactive map page for viewing and filtering properties
 */

'use client'

import { Suspense, useState } from 'react'
import PropertyMap, { type MapFilterOptions, type BaseMapType } from '@/components/map/PropertyMap'
import VerTopNav from '@/components/layout/VerTopNav'
import MapFilters from '@/components/map/MapFilters'
import MapControls from '@/components/map/MapControls'
import type { Property } from '@/lib/types'
import type { Geometry } from 'geojson'

export default function MapPage() {
  const [filters, setFilters] = useState<MapFilterOptions>({})
  const [baseMap, setBaseMap] = useState<BaseMapType>('osm')
  const [showFilters, setShowFilters] = useState(true)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)

  const handlePropertyClick = (property: Property) => {
    setSelectedProperty(property)
    // Could navigate to property detail page or show modal
    console.log('Property clicked:', property)
  }

  const handleDrawComplete = (geometry: Geometry) => {
    // Handle drawn geometry for spatial queries
    console.log('Geometry drawn:', geometry)
    // Could update filters with bounding box or use for spatial query
  }

  return (
    <div className="map-page-container min-h-screen flex flex-col">
      <VerTopNav />
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-2 shrink-0">
        <h1 className="text-xl font-bold text-gray-900">Property Map</h1>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        {/* Sidebar with Filters and Controls */}
        <aside
          className={`${
            showFilters ? 'w-full md:w-80' : 'w-0'
          } bg-gray-50 border-r border-gray-200 transition-all duration-300 overflow-y-auto`}
        >
          <div className="p-4 space-y-4">
            <MapControls
              baseMap={baseMap}
              onBaseMapChange={setBaseMap}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters(!showFilters)}
            />

            {showFilters && (
              <MapFilters filters={filters} onFiltersChange={setFilters} />
            )}

            {/* Selected Property Info */}
            {selectedProperty && (
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <h3 className="font-semibold text-lg mb-2">Selected Property</h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Property No:</span> {selectedProperty.property_no}
                  </p>
                  <p>
                    <span className="font-medium">Address:</span> {selectedProperty.address}
                  </p>
                  {selectedProperty.owner_name && (
                    <p>
                      <span className="font-medium">Owner:</span> {selectedProperty.owner_name}
                    </p>
                  )}
                </div>
                <a
                  href={`/properties/${selectedProperty.id}`}
                  className="mt-3 inline-block text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View Details →
                </a>
              </div>
            )}
          </div>
        </aside>

        {/* Map Container */}
        <main className="flex-1 relative">
          <Suspense
            fallback={
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-lg">Loading map...</div>
              </div>
            }
          >
            <PropertyMap
              initialCenter={[0, 0]}
              initialZoom={2}
              baseMap={baseMap}
              filters={filters}
              onPropertyClick={handlePropertyClick}
              showDrawingTools={true}
              onDrawComplete={handleDrawComplete}
              height="100%"
            />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
