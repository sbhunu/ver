'use client'

/**
 * Audit Logs Viewer Component
 * 
 * Client component for viewing and filtering audit logs
 */

import { useState, useEffect, useCallback } from 'react'
import type { AuditLog, ActionType, LogTargetType } from '@/lib/types'

interface AuditLogFilters {
  dateFrom?: string
  dateTo?: string
  actorId?: string
  action?: ActionType
  targetType?: LogTargetType
  targetId?: string
  search?: string
  limit: number
  offset: number
}

interface AuditLogResponse {
  success: boolean
  data: {
    logs: AuditLog[]
    pagination: {
      total: number
      limit: number
      offset: number
      hasMore: boolean
    }
  }
}

export default function AuditLogsViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const [filters, setFilters] = useState<AuditLogFilters>({
    limit: 50,
    offset: 0,
  })

  const [currentPage, setCurrentPage] = useState(0)

  // Fetch audit logs
  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.set('dateTo', filters.dateTo)
      if (filters.actorId) params.set('actorId', filters.actorId)
      if (filters.action) params.set('action', filters.action)
      if (filters.targetType) params.set('targetType', filters.targetType)
      if (filters.targetId) params.set('targetId', filters.targetId)
      if (filters.search) params.set('search', filters.search)
      params.set('limit', filters.limit.toString())
      params.set('offset', filters.offset.toString())

      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`)
      const data: AuditLogResponse = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.data?.logs ? 'Failed to fetch logs' : 'Unauthorized')
      }

      setLogs(data.data.logs)
      setTotal(data.data.pagination.total)
      setHasMore(data.data.pagination.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Handle filter changes
  const handleFilterChange = (key: keyof AuditLogFilters, value: string | number | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      offset: 0, // Reset to first page when filters change
    }))
    setCurrentPage(0)
  }

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    setFilters((prev) => ({
      ...prev,
      offset: newPage * prev.limit,
    }))
  }

  // Handle export
  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const params = new URLSearchParams()
      
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.set('dateTo', filters.dateTo)
      if (filters.actorId) params.set('actorId', filters.actorId)
      if (filters.action) params.set('action', filters.action)
      if (filters.targetType) params.set('targetType', filters.targetType)
      if (filters.targetId) params.set('targetId', filters.targetId)
      params.set('format', format)

      const response = await fetch(`/api/admin/audit-logs/export?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      alert('Failed to export audit logs')
    }
  }

  const totalPages = Math.ceil(total / filters.limit)

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date From</label>
            <input
              type="datetime-local"
              value={filters.dateFrom || ''}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value || undefined)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date To</label>
            <input
              type="datetime-local"
              value={filters.dateTo || ''}
              onChange={(e) => handleFilterChange('dateTo', e.target.value || undefined)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Action</label>
            <select
              value={filters.action || ''}
              onChange={(e) => handleFilterChange('action', e.target.value || undefined)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">All Actions</option>
              <option value="upload">Upload</option>
              <option value="hash">Hash</option>
              <option value="verify">Verify</option>
              <option value="delete">Delete</option>
              <option value="export">Export</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="update">Update</option>
              <option value="create">Create</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Target Type</label>
            <input
              type="text"
              value={filters.targetType || ''}
              onChange={(e) => handleFilterChange('targetType', e.target.value || undefined)}
              placeholder="document, property, etc."
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value || undefined)}
              placeholder="Search in details..."
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                setFilters({ limit: 50, offset: 0 })
                setCurrentPage(0)
              }}
              className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => handleExport('csv')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Export CSV
        </button>
        <button
          onClick={() => handleExport('pdf')}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          disabled
        >
          Export PDF (Coming Soon)
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center">
                    Loading...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono">{log.id.slice(0, 8)}...</td>
                    <td className="px-6 py-4 text-sm">{log.actor_id.slice(0, 8)}...</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {log.target_type && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                          {log.target_type}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono">{log.ip_address || '-'}</td>
                    <td className="px-6 py-4 text-sm">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <details className="cursor-pointer">
                        <summary className="text-blue-600 hover:underline">View</summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-w-md">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && logs.length > 0 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {filters.offset + 1} to {Math.min(filters.offset + filters.limit, total)} of {total} logs
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0}
                className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="px-4 py-2">
                Page {currentPage + 1} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!hasMore}
                className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
