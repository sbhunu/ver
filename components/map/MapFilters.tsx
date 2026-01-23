'use client'

/**
 * Map Filters Component
 * 
 * Filter controls for the property map (document status, date ranges, etc.)
 */

import { useState } from 'react'
import type { MapFilterOptions } from './PropertyMap'

export interface MapFiltersProps {
  filters: MapFilterOptions
  onFiltersChange: (filters: MapFilterOptions) => void
}

export default function MapFilters({ filters, onFiltersChange }: MapFiltersProps) {
  const [documentStatus, setDocumentStatus] = useState(filters.documentStatus || '')
  const [startDate, setStartDate] = useState(filters.startDate || '')
  const [endDate, setEndDate] = useState(filters.endDate || '')

  const handleApplyFilters = () => {
    onFiltersChange({
      documentStatus: documentStatus || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })
  }

  const handleClearFilters = () => {
    setDocumentStatus('')
    setStartDate('')
    setEndDate('')
    onFiltersChange({})
  }

  return (
    <div className="map-filters bg-white p-4 rounded-lg shadow-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Map Filters</h3>

      <div className="space-y-4">
        {/* Document Status Filter */}
        <div>
          <label htmlFor="document-status" className="block text-sm font-medium text-gray-700 mb-1">
            Document Status
          </label>
          <select
            id="document-status"
            value={documentStatus}
            onChange={(e) => setDocumentStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="hashed">Hashed</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
            <option value="flagged">Flagged</option>
          </select>
        </div>

        {/* Date Range Filters */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              id="start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              id="end-date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleApplyFilters}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Apply Filters
          </button>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}
