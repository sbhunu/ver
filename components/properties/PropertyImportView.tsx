'use client'

/**
 * Property Import View
 *
 * CSV/JSON upload, options, progress, results, and import history.
 * Task Reference: 8.4
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import VerTopNav from '@/components/layout/VerTopNav'

interface ImportResult {
  total: number
  successful: number
  failed: number
  skipped: number
  results: Array<{ success: boolean; property_no?: string; error?: string; errorCode?: string; rowNumber?: number }>
  errors: Array<{ rowNumber: number; property_no?: string; error: string; errorCode: string }>
  importId: string
  durationMs: number
}

interface ImportHistoryEntry {
  id: string
  created_at: string
  import_id: string
  total: number
  successful: number
  failed: number
  skipped: number
  actor_id?: string
}

export interface PropertyImportViewProps {
  user: { id: string; email: string; role: string }
}

export default function PropertyImportView({ user }: PropertyImportViewProps) {
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<'auto' | 'csv' | 'json'>('auto')
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [detectOverlaps, setDetectOverlaps] = useState(false)
  const [overlapThreshold, setOverlapThreshold] = useState(0.8)
  const [batchSize, setBatchSize] = useState(50)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [history, setHistory] = useState<ImportHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch(
        '/api/admin/audit-logs?targetType=property_import&limit=20'
      )
      const data = await res.json()
      if (!res.ok) {
        setHistory([])
        return
      }
      const logs = data?.data?.logs ?? []
      const entries: ImportHistoryEntry[] = logs.map((log: {
        id: string
        created_at: string
        target_id: string | null
        actor_id?: string
        details?: Record<string, unknown>
      }) => ({
        id: log.id,
        created_at: log.created_at,
        import_id: (log.details?.import_id as string) ?? log.target_id ?? log.id,
        total: (log.details?.total as number) ?? 0,
        successful: (log.details?.successful as number) ?? 0,
        failed: (log.details?.failed as number) ?? 0,
        skipped: (log.details?.skipped as number) ?? 0,
        actor_id: log.actor_id,
      }))
      setHistory(entries)
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    setFile(f ?? null)
    setError(null)
    setResult(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    if (!file) {
      setError('Please select a CSV or JSON file')
      return
    }
    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('format', format === 'auto' ? '' : format)
      formData.append('skip_duplicates', String(skipDuplicates))
      formData.append('detect_geometry_overlaps', String(detectOverlaps))
      formData.append('overlap_threshold', String(overlapThreshold))
      formData.append('batch_size', String(batchSize))

      const res = await fetch('/api/properties/import', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error ?? `Import failed: ${res.status}`)
      }
      setResult(data?.import ?? null)
      setFile(null)
      const input = document.getElementById('import-file') as HTMLInputElement
      if (input) input.value = ''
      fetchHistory()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <VerTopNav />
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Property Import</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Bulk import properties from CSV or JSON (WKT/GeoJSON geometry)
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                File <span className="text-red-500">*</span>
              </label>
              <input
                id="import-file"
                type="file"
                accept=".csv,.json,text/csv,application/json"
                onChange={handleFileChange}
                disabled={importing}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium hover:file:bg-blue-100 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as 'auto' | 'csv' | 'json')}
                disabled={importing}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="auto">Auto-detect from file</option>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  disabled={importing}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Skip duplicates (property_no)</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={detectOverlaps}
                  onChange={(e) => setDetectOverlaps(e.target.checked)}
                  disabled={importing}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Detect geometry overlaps</span>
              </label>
            </div>

            {detectOverlaps && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Overlap threshold (0–1)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.1}
                    value={overlapThreshold}
                    onChange={(e) => setOverlapThreshold(parseFloat(e.target.value) || 0.8)}
                    disabled={importing}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Batch size
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={batchSize}
                    onChange={(e) => setBatchSize(parseInt(e.target.value, 10) || 50)}
                    disabled={importing}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>
              </div>
            )}

            {!detectOverlaps && (
              <div className="max-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batch size
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value, 10) || 50)}
                  disabled={importing}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={importing || !file}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Importing…
                  </>
                ) : (
                  'Import'
                )}
              </button>
            </div>
          </form>

          {result && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Import result</h2>
              <dl className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
                <dt className="text-gray-500">Total</dt>
                <dd className="font-medium">{result.total}</dd>
                <dt className="text-gray-500">Successful</dt>
                <dd className="font-medium text-green-600">{result.successful}</dd>
                <dt className="text-gray-500">Failed</dt>
                <dd className="font-medium text-red-600">{result.failed}</dd>
                <dt className="text-gray-500">Skipped</dt>
                <dd className="font-medium text-amber-600">{result.skipped}</dd>
                <dt className="text-gray-500">Duration</dt>
                <dd className="font-medium">{result.durationMs} ms</dd>
              </dl>
              <p className="text-xs text-gray-500">Import ID: {result.importId}</p>
              {result.errors && result.errors.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Errors ({result.errors.length})
                  </h3>
                  <div className="max-h-60 overflow-auto rounded border border-gray-200">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="px-3 py-1.5 text-left">Row</th>
                          <th className="px-3 py-1.5 text-left">Property</th>
                          <th className="px-3 py-1.5 text-left">Code</th>
                          <th className="px-3 py-1.5 text-left">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {result.errors.slice(0, 100).map((err, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-1.5">{err.rowNumber}</td>
                            <td className="px-3 py-1.5">{err.property_no ?? '—'}</td>
                            <td className="px-3 py-1.5">{err.errorCode}</td>
                            <td className="px-3 py-1.5 text-red-600 truncate max-w-[200px]" title={err.error}>
                              {err.error}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {result.errors.length > 100 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Showing first 100 of {result.errors.length} errors
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Import history</h2>
            <button
              type="button"
              onClick={fetchHistory}
              disabled={historyLoading}
              className="text-sm font-medium text-blue-600 hover:text-blue-500 disabled:opacity-50"
            >
              {historyLoading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
          {historyLoading && history.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500 text-sm">
              Loading…
            </div>
          ) : history.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500 text-sm">
              No imports yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Date
                    </th>
                    <th className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Import ID
                    </th>
                    <th className="px-6 py-2 text-right text-xs font-medium uppercase text-gray-500">
                      Total
                    </th>
                    <th className="px-6 py-2 text-right text-xs font-medium uppercase text-gray-500">
                      OK
                    </th>
                    <th className="px-6 py-2 text-right text-xs font-medium uppercase text-gray-500">
                      Failed
                    </th>
                    <th className="px-6 py-2 text-right text-xs font-medium uppercase text-gray-500">
                      Skipped
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-900">
                        {new Date(h.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600 font-mono">
                        {h.import_id.slice(0, 8)}…
                      </td>
                      <td className="px-6 py-3 text-sm text-right">{h.total}</td>
                      <td className="px-6 py-3 text-sm text-right text-green-600">
                        {h.successful}
                      </td>
                      <td className="px-6 py-3 text-sm text-right text-red-600">
                        {h.failed}
                      </td>
                      <td className="px-6 py-3 text-sm text-right text-amber-600">
                        {h.skipped}
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
