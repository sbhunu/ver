'use client'

/**
 * Report Builder
 *
 * Report type, format, and filter configuration; generate and download.
 * Task Reference: 10.1, 10.2, 10.3
 */

import { useState } from 'react'
import Link from 'next/link'

const REPORT_TYPES = [
  { value: 'audit-logs', label: 'Audit logs' },
  { value: 'verification-reports', label: 'Verification reports' },
  { value: 'property-listings', label: 'Property listings' },
] as const

const FORMATS = [
  { value: 'json', label: 'JSON' },
  { value: 'csv', label: 'CSV' },
  { value: 'pdf', label: 'PDF (HTML)' },
] as const

const ROLE_DASHBOARDS: Record<string, string> = {
  staff: '/dashboard/staff',
  verifier: '/dashboard/verifier',
  chief_registrar: '/dashboard/chief-registrar',
  admin: '/dashboard/admin',
}

export interface ReportBuilderProps {
  user: { id: string; email: string; role: string }
}

export default function ReportBuilder({ user }: ReportBuilderProps) {
  const dashboardHref = ROLE_DASHBOARDS[user.role] ?? '/dashboard/chief-registrar'

  const [reportType, setReportType] = useState<(typeof REPORT_TYPES)[number]['value']>('audit-logs')
  const [format, setFormat] = useState<(typeof FORMATS)[number]['value']>('json')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState('')
  const [actionType, setActionType] = useState('')
  const [propertyNumber, setPropertyNumber] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<{
    type: string
    format: string
    recordCount: number
    total: number
    generatedAt: string
  } | null>(null)
  const [lastJsonBlob, setLastJsonBlob] = useState<Blob | null>(null)

  const buildQuery = () => {
    const params = new URLSearchParams()
    params.set('type', reportType)
    params.set('format', format)
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    if (status) params.set('status', status)
    if (reportType === 'audit-logs' && actionType) params.set('actionType', actionType)
    if (reportType === 'property-listings' && propertyNumber) params.set('propertyNumber', propertyNumber)
    return params.toString()
  }

  const handleGenerate = async () => {
    setError(null)
    setLastResult(null)
    setLastJsonBlob(null)
    setGenerating(true)
    try {
      const qs = buildQuery()
      const res = await fetch(`/api/reports/generate?${qs}`)
      const contentType = res.headers.get('Content-Type') ?? ''

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? `HTTP ${res.status}`)
      }

      if (format === 'json') {
        const data = (await res.json()) as {
          type?: string
          format?: string
          recordCount?: number
          total?: number
          generatedAt?: string
          data?: unknown[]
        }
        setLastResult({
          type: data.type ?? reportType,
          format: data.format ?? 'json',
          recordCount: data.recordCount ?? data.data?.length ?? 0,
          total: data.total ?? data.recordCount ?? 0,
          generatedAt: data.generatedAt ?? new Date().toISOString(),
        })
        setLastJsonBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
        return
      }

      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition')
      const match = disposition?.match(/filename="?([^";\n]+)"?/)
      const name = match?.[1] ?? `${reportType}-${new Date().toISOString().slice(0, 10)}.${format === 'csv' ? 'csv' : 'html'}`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.click()
      URL.revokeObjectURL(url)
      setLastResult({
        type: reportType,
        format,
        recordCount: 0,
        total: 0,
        generatedAt: new Date().toISOString(),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Report generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const showDateRange = reportType === 'audit-logs' || reportType === 'verification-reports'
  const showStatus = reportType === 'verification-reports' || reportType === 'property-listings'
  const showActionType = reportType === 'audit-logs'
  const showPropertyNumber = reportType === 'property-listings'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link
            href="/reports/schedules"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            Schedules
          </Link>
          <span className="text-gray-400">|</span>
          <Link
            href={dashboardHref}
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Report Builder</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Generate audit logs, verification reports, or property listings (JSON, CSV, PDF).
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleGenerate()
            }}
            className="px-6 py-4 space-y-4"
          >
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as (typeof REPORT_TYPES)[number]['value'])}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {REPORT_TYPES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as (typeof FORMATS)[number]['value'])}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {FORMATS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {showDateRange && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {showStatus && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <input
                  type="text"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  placeholder={
                    reportType === 'verification-reports'
                      ? 'e.g. verified, rejected'
                      : 'e.g. active, inactive'
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            )}

            {showActionType && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action type</label>
                <input
                  type="text"
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  placeholder="e.g. upload, verify, login"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            )}

            {showPropertyNumber && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property number
                </label>
                <input
                  type="text"
                  value={propertyNumber}
                  onChange={(e) => setPropertyNumber(e.target.value)}
                  placeholder="Filter by property number"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={generating}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Generating report…
                  </>
                ) : (
                  'Generate report'
                )}
              </button>
            </div>
          </form>

          {lastResult && format === 'json' && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Last report</h2>
              <dl className="grid grid-cols-2 gap-2 text-sm mb-4">
                <dt className="text-gray-500">Type</dt>
                <dd className="font-medium">{lastResult.type}</dd>
                <dt className="text-gray-500">Records</dt>
                <dd className="font-medium">
                  {lastResult.recordCount} {lastResult.total !== lastResult.recordCount ? `of ${lastResult.total}` : ''}
                </dd>
                <dt className="text-gray-500">Generated</dt>
                <dd className="font-medium">
                  {new Date(lastResult.generatedAt).toLocaleString()}
                </dd>
              </dl>
              {lastJsonBlob && (
                <button
                  type="button"
                  onClick={() => {
                    const url = URL.createObjectURL(lastJsonBlob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${lastResult.type}-${new Date(lastResult.generatedAt).toISOString().slice(0, 10)}.json`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                >
                  Download JSON
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
