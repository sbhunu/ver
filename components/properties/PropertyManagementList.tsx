'use client'

/**
 * Property Management List Component
 *
 * Lists properties with search/filter, deeds status, Upload Deed, and Hash actions.
 * Supports: property_no, address, owner_name search; status filter; sort; pagination.
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import VerTopNav from '@/components/layout/VerTopNav'
import StatusBadge from '@/components/dashboard/StatusBadge'
import type { Property } from '@/lib/types'
import type { Document } from '@/lib/types'

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

interface PropertyWithDocuments extends Property {
  documents: Document[]
}

interface ApiResult {
  properties: PropertyWithDocuments[]
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

export interface PropertyManagementListProps {
  user: { id: string; email: string; role: string }
}

export default function PropertyManagementList({ user }: PropertyManagementListProps) {
  const [properties, setProperties] = useState<PropertyWithDocuments[]>([])
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
  const [hashingDocId, setHashingDocId] = useState<string | null>(null)

  const fetchProperties = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('page_size', String(pageSize))
      params.set('sort_by', sortBy)
      params.set('sort_order', sortOrder)
      if (statusFilter) params.set('status', statusFilter)
      if (search) params.set('search', search)
      const res = await fetch(`/api/properties/management?${params}`)
      const data: ApiResult = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Failed to load properties')
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

  const handleHash = async (documentId: string) => {
    setHashingDocId(documentId)
    try {
      const res = await fetch(`/api/documents/${documentId}/hash`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Hash failed')
      await fetchProperties()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to hash document')
    } finally {
      setHashingDocId(null)
    }
  }

  const handleClearFilters = () => {
    setStatusFilter('')
    setSearch('')
    setSearchInput('')
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <VerTopNav />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link
            href="/properties/new"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            + Add Property
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Property Management</h1>
            <p className="text-sm text-gray-600 mt-1">
              List properties, search by property no / address / owner, upload title deeds, and hash
              deeds for verification.
            </p>
          </div>

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
              <label htmlFor="search" className="block text-xs font-medium text-gray-700 mb-1">
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
                onKeyDown={(e) => e.key === 'Enter' && (setSearch(searchInput), setPage(1))}
                placeholder="Property no, address, owner…"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="sort-by" className="block text-xs font-medium text-gray-700 mb-1">
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
              <label htmlFor="sort-order" className="block text-xs font-medium text-gray-700 mb-1">
                Order
              </label>
              <select
                id="sort-order"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSearch(searchInput)
                  setPage(1)
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Search
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>

          {error && (
            <div className="mx-6 mt-4 rounded-md bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}

          {loading && (
            <div className="px-6 py-12 text-center text-gray-500">Loading properties…</div>
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
                        Deeds
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {properties.map((p) => {
                      const docs = p.documents ?? []
                      const pendingDocs = docs.filter((d) => d.status === 'pending')
                      const hashedCount = docs.filter((d) => d.status === 'hashed').length
                      return (
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
                            <StatusBadge status={p.status ?? 'active'} size="sm" />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {docs.length === 0 ? (
                              <span className="text-amber-600">No deeds</span>
                            ) : (
                              <span>
                                {hashedCount} hashed / {docs.length} total
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                            <Link
                              href={`/upload?property_id=${p.id}&returnTo=/properties/management`}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              Upload Deed
                            </Link>
                            {pendingDocs.length > 0 &&
                              pendingDocs.map((d) => (
                                <button
                                  key={d.id}
                                  type="button"
                                  onClick={() => handleHash(d.id)}
                                  disabled={hashingDocId === d.id}
                                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-amber-700 bg-amber-100 rounded hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {hashingDocId === d.id ? 'Hashing…' : `Hash (${d.doc_number})`}
                                </button>
                              ))}
                            <Link
                              href={`/properties/${p.id}`}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
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
        </div>
      </div>
    </div>
  )
}
