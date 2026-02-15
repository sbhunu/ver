'use client'

/**
 * Document List Component
 *
 * Displays documents with filtering (status, property, date range),
 * status badges, links to detail pages, and real-time updates.
 * Task Reference: 4.4
 */

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import VerTopNav from '@/components/layout/VerTopNav'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeDocuments } from '@/lib/hooks/useRealtimeDocuments'
import StatusBadge from '@/components/dashboard/StatusBadge'
import type { Document } from '@/lib/types'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'hashed', label: 'Hashed' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'flagged', label: 'Flagged' },
]

export interface DocumentListProps {
  user: { id: string; email: string; role: string }
}

interface PropertyMap {
  id: string
  property_no: string
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function formatFileSize(bytes: number | null) {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function DocumentList({ user }: DocumentListProps) {
  const [properties, setProperties] = useState<PropertyMap[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [propertyFilter, setPropertyFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { documents, loading, error } = useRealtimeDocuments({
    status: statusFilter || undefined,
    propertyId: propertyFilter || undefined,
  })

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data } = await supabase
        .from('ver_properties')
        .select('id, property_no')
        .order('property_no', { ascending: true })
        .limit(500)
      setProperties((data as PropertyMap[]) ?? [])
    }
    load()
  }, [])

  const propertyMap = useMemo(() => {
    const m = new Map<string, string>()
    properties.forEach((p) => m.set(p.id, p.property_no))
    return m
  }, [properties])

  const filteredByDate = useMemo(() => {
    if (!dateFrom && !dateTo) return documents
    return documents.filter((d) => {
      const t = new Date(d.created_at).getTime()
      const from = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : -Infinity
      const to = dateTo ? new Date(dateTo + 'T23:59:59.999').getTime() : Infinity
      return t >= from && t <= to
    })
  }, [documents, dateFrom, dateTo])

  return (
    <div className="min-h-screen bg-gray-50">
      <VerTopNav />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
            <p className="text-sm text-gray-600 mt-1">
              Browse and filter property deed documents. Updates in real time.
            </p>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label htmlFor="status-filter" className="block text-xs font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
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
              <label htmlFor="property-filter" className="block text-xs font-medium text-gray-700 mb-1">
                Property
              </label>
              <select
                id="property-filter"
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All properties</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.property_no}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="date-from" className="block text-xs font-medium text-gray-700 mb-1">
                From date
              </label>
              <input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="date-to" className="block text-xs font-medium text-gray-700 mb-1">
                To date
              </label>
              <input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('')
                  setPropertyFilter('')
                  setDateFrom('')
                  setDateTo('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Clear filters
              </button>
            </div>
          </div>

          {error && (
            <div className="mx-6 mt-4 rounded-md bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">{error.message}</p>
            </div>
          )}

          {loading && (
            <div className="px-6 py-12 text-center text-gray-500">Loading documents…</div>
          )}

          {!loading && filteredByDate.length === 0 && (
            <div className="px-6 py-12 text-center text-gray-500">
              {documents.length === 0
                ? 'No documents match the current filters.'
                : 'No documents match the date range.'}
            </div>
          )}

          {!loading && filteredByDate.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Document
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Property
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Uploaded
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredByDate.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{doc.doc_number}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]">
                          {doc.original_filename ?? '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {propertyMap.get(doc.property_id) ?? (
                          <span className="text-gray-400">
                            {doc.property_id.slice(0, 8)}…
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={doc.status} size="sm" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatFileSize(doc.file_size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(doc.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Link
                          href={`/documents/${doc.id}`}
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
          )}
        </div>
      </div>
    </div>
  )
}
