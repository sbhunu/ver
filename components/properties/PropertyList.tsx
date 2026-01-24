'use client'

/**
 * Property List Component
 *
 * Displays properties with pagination, filtering (status, search),
 * status badges, links to detail pages, and map view toggle.
 * Task Reference: 8.2
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import StatusBadge from '@/components/dashboard/StatusBadge'
import type { Property } from '@/lib/types'

const PropertyMap = dynamic(
  () => import('@/components/map/PropertyMap').then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[400px] flex items-center justify-center bg-gray-100 rounded-lg">
        <span className="text-gray-500">Loading map…</span>
      </div>
    ),
  }
)

const ROLE_DASHBOARDS: Record<string, string> = {
  staff: '/dashboard/staff',
  verifier: '/dashboard/verifier',
  chief_registrar: '/dashboard/chief-registrar',
  admin: '/dashboard/admin',
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
  { value: 'archived', label: 'Archived' },
]

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Created' },
  { value: 'updated_at', label: 'Updated' },
  { value: 'property_no', label: 'Property No.' },
  { value: 'address', label: 'Address' },
  { value: 'registration_date', label: 'Registration date' },
] as const

type ViewMode = 'table' | 'map'

interface ApiResult {
  properties: Property[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

function formatDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

function formatArea(m2: number | null) {
  if (m2 == null) return '—'
  if (m2 < 10_000) return `${Math.round(m2)} m²`
  return `${(m2 / 10_000).toFixed(2)} ha`
}

export interface PropertyListProps {
  user: { id: string; email: string; role: string }
}

export default function PropertyList({ user }: PropertyListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [properties, setProperties] = useState<Property[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]['value']>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [searchInput, setSearchInput] = useState('')

  const dashboardHref = ROLE_DASHBOARDS[user.role] ?? '/dashboard/staff'

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const fetchProperties = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('page_size', String(pageSize))
    params.set('sort_by', sortBy)
    params.set('sort_order', sortOrder)
    if (statusFilter) params.set('status', statusFilter)
    if (search.trim()) params.set('search', search.trim())

    try {
      const res = await fetch(`/api/properties?${params}`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as ApiResult
      setProperties(data.properties)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load properties')
      setProperties([])
      setTotal(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, sortBy, sortOrder, statusFilter, search])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])

  const handleClearFilters = () => {
    setStatusFilter('')
    setSearch('')
    setSearchInput('')
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <Link
            href={dashboardHref}
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
              <p className="text-sm text-gray-600 mt-1">
                Browse properties with optional map view.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  viewMode === 'map'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Map
              </button>
              <Link
                href="/map"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Full map →
              </Link>
            </div>
          </div>

          {viewMode === 'table' && (
            <>
              {/* Filters */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label
                    htmlFor="status-filter"
                    className="block text-xs font-medium text-gray-700 mb-1"
                  >
                    Status
                  </label>
                  <select
                    id="status-filter"
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value)
                      setPage(1)
                    }}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value || 'all'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="search"
                    className="block text-xs font-medium text-gray-700 mb-1"
                  >
                    Search
                  </label>
                  <input
                    id="search"
                    type="text"
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value)
                      setPage(1)
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && fetchProperties()}
                    placeholder="Property no, address, owner…"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="sort-by"
                    className="block text-xs font-medium text-gray-700 mb-1"
                  >
                    Sort by
                  </label>
                  <select
                    id="sort-by"
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(e.target.value as (typeof SORT_OPTIONS)[number]['value'])
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="sort-order"
                    className="block text-xs font-medium text-gray-700 mb-1"
                  >
                    Order
                  </label>
                  <select
                    id="sort-order"
                    value={sortOrder}
                    onChange={(e) =>
                      setSortOrder(e.target.value as 'asc' | 'desc')
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Clear filters
                  </button>
                </div>
              </div>

              {error && (
                <div className="mx-6 mt-4 rounded-md bg-red-50 p-4">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              )}

              {loading && (
                <div className="px-6 py-12 text-center text-gray-500">
                  Loading properties…
                </div>
              )}

              {!loading && properties.length === 0 && (
                <div className="px-6 py-12 text-center text-gray-500">
                  No properties match the current filters.
                </div>
              )}

              {!loading && properties.length > 0 && (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Property No.
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Address
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Owner
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Area
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Registered
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {properties.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {p.property_no}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 max-w-[200px] truncate">
                              {p.address}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {p.owner_name ?? '—'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <StatusBadge status={p.status} size="sm" />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatArea(p.area)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(p.registration_date)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <Link
                                href={`/properties/${p.id}`}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800"
                              >
                                View
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="px-6 py-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
                    <p className="text-sm text-gray-600">
                      {total === 0
                        ? 'No properties'
                        : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={page <= 1}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-600">
                        Page {page} of {totalPages || 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={page >= totalPages}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {viewMode === 'map' && (
            <div className="p-4">
              <div className="h-[500px] rounded-lg overflow-hidden border border-gray-200">
                <PropertyMap
                  initialCenter={[0, 0]}
                  initialZoom={2}
                  baseMap="osm"
                  filters={{}}
                  height="100%"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Use <Link href="/map" className="text-blue-600 hover:text-blue-800">Full map</Link> for
                filters and drawing tools.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
