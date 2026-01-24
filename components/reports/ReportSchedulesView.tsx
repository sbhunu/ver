'use client'

/**
 * Report Schedules View
 *
 * List, create, edit, enable/disable, delivery history.
 * Task Reference: 10.4
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const REPORT_TYPES = [
  { value: 'audit-logs', label: 'Audit logs' },
  { value: 'verification-reports', label: 'Verification reports' },
  { value: 'property-listings', label: 'Property listings' },
] as const

const FORMATS = [
  { value: 'json', label: 'JSON' },
  { value: 'csv', label: 'CSV' },
  { value: 'pdf', label: 'PDF' },
] as const

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
] as const

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
] as const

interface Schedule {
  id: string
  report_type: string
  format: string
  frequency: string
  day_of_week: number | null
  day_of_month: number | null
  time_of_day: string
  timezone: string
  email_recipients: string[]
  enabled: boolean
  last_run_at: string | null
  next_run_at: string
  created_at: string
  updated_at: string
}

interface Delivery {
  id: string
  recipient_email: string
  status: string
  sent_at: string | null
  error_message: string | null
  retry_count: number
  created_at: string
}

const DEFAULT_FORM = {
  report_type: 'audit-logs' as const,
  format: 'pdf' as const,
  frequency: 'daily' as const,
  day_of_week: 1,
  day_of_month: 1,
  time_of_day: '09:00',
  timezone: 'UTC',
  email_recipients: '',
  enabled: true,
}

function parseEmails(s: string): string[] {
  return s
    .split(/[\n,]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export interface ReportSchedulesViewProps {
  user: { id: string; email: string; role: string }
}

export default function ReportSchedulesView({ user }: ReportSchedulesViewProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deliveriesId, setDeliveriesId] = useState<string | null>(null)
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [deliveriesLoading, setDeliveriesLoading] = useState(false)

  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/reports/schedules')
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Failed to fetch')
      setSchedules(data.schedules ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load schedules')
      setSchedules([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  const fetchDeliveries = useCallback(async (id: string) => {
    setDeliveriesLoading(true)
    try {
      const res = await fetch(`/api/reports/schedules/${id}/deliveries`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Failed to fetch')
      setDeliveries(data.deliveries ?? [])
    } catch {
      setDeliveries([])
    } finally {
      setDeliveriesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (deliveriesId) fetchDeliveries(deliveriesId)
    else setDeliveries([])
  }, [deliveriesId, fetchDeliveries])

  const openEdit = (s: Schedule) => {
    setError(null)
    setEditId(s.id)
    setShowCreate(false)
    const tod = s.time_of_day?.slice(0, 5) || '09:00'
    setForm({
      report_type: s.report_type as (typeof REPORT_TYPES)[number]['value'],
      format: s.format as (typeof FORMATS)[number]['value'],
      frequency: s.frequency as (typeof FREQUENCIES)[number]['value'],
      day_of_week: s.day_of_week ?? 1,
      day_of_month: s.day_of_month ?? 1,
      time_of_day: tod,
      timezone: s.timezone || 'UTC',
      email_recipients: (s.email_recipients ?? []).join('\n'),
      enabled: s.enabled,
    })
  }

  const closeCreate = () => {
    setShowCreate(false)
    setForm(DEFAULT_FORM)
    setError(null)
  }
  const closeEdit = () => {
    setEditId(null)
    setForm(DEFAULT_FORM)
    setError(null)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        report_type: form.report_type,
        format: form.format,
        frequency: form.frequency,
        time_of_day: form.time_of_day.length === 5 ? `${form.time_of_day}:00` : form.time_of_day,
        timezone: form.timezone,
        email_recipients: parseEmails(form.email_recipients),
        enabled: form.enabled,
      }
      if (form.frequency === 'weekly') body.day_of_week = form.day_of_week
      if (form.frequency === 'monthly') body.day_of_month = form.day_of_month
      if (parseEmails(form.email_recipients).length === 0) {
        throw new Error('At least one email recipient is required')
      }
      const res = await fetch('/api/reports/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Create failed')
      fetchSchedules()
      closeCreate()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editId) return
    setSubmitting(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        report_type: form.report_type,
        format: form.format,
        frequency: form.frequency,
        time_of_day: form.time_of_day.length === 5 ? `${form.time_of_day}:00` : form.time_of_day,
        timezone: form.timezone,
        email_recipients: parseEmails(form.email_recipients),
        enabled: form.enabled,
      }
      if (form.frequency === 'weekly') body.day_of_week = form.day_of_week
      if (form.frequency === 'monthly') body.day_of_month = form.day_of_month
      if (parseEmails(form.email_recipients).length === 0) {
        throw new Error('At least one email recipient is required')
      }
      const res = await fetch(`/api/reports/schedules/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Update failed')
      fetchSchedules()
      closeEdit()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleEnabled = async (s: Schedule) => {
    try {
      const res = await fetch(`/api/reports/schedules/${s.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !s.enabled }),
      })
      if (!res.ok) throw new Error('Toggle failed')
      fetchSchedules()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Toggle failed')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this schedule?')) return
    try {
      const res = await fetch(`/api/reports/schedules/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      fetchSchedules()
      if (editId === id) closeEdit()
      if (deliveriesId === id) setDeliveriesId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  const renderForm = (onSubmit: (e: React.FormEvent) => void, onCancel: () => void) => (
    <form onSubmit={onSubmit} className="space-y-4 p-4 bg-gray-50 rounded-lg">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Report type</label>
          <select
            value={form.report_type}
            onChange={(e) => setForm({ ...form, report_type: e.target.value as typeof form.report_type })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            required
          >
            {REPORT_TYPES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
          <select
            value={form.format}
            onChange={(e) => setForm({ ...form, format: e.target.value as typeof form.format })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {FORMATS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
          <select
            value={form.frequency}
            onChange={(e) => setForm({ ...form, frequency: e.target.value as typeof form.frequency })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {FREQUENCIES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        {form.frequency === 'weekly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Day of week</label>
            <select
              value={form.day_of_week}
              onChange={(e) => setForm({ ...form, day_of_week: parseInt(e.target.value, 10) })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {DAYS_OF_WEEK.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}
        {form.frequency === 'monthly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Day of month (1–28)</label>
            <input
              type="number"
              min={1}
              max={28}
              value={form.day_of_month}
              onChange={(e) => setForm({ ...form, day_of_month: parseInt(e.target.value, 10) || 1 })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
          <input
            type="time"
            value={form.time_of_day}
            onChange={(e) => setForm({ ...form, time_of_day: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
          <input
            type="text"
            value={form.timezone}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            placeholder="UTC"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email recipients <span className="text-red-500">*</span> (one per line or comma-separated)
        </label>
        <textarea
          value={form.email_recipients}
          onChange={(e) => setForm({ ...form, email_recipients: e.target.value })}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="a@example.com, b@example.com"
          required
        />
      </div>
      {editId && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="enabled"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            className="rounded border-gray-300"
          />
          <label htmlFor="enabled" className="text-sm text-gray-700">Enabled</label>
        </div>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : editId ? 'Update' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )

  const scheduleForDeliveries = schedules.find((s) => s.id === deliveriesId)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link href="/reports" className="text-sm font-medium text-blue-600 hover:text-blue-500">
            ← Reports
          </Link>
          <span className="text-gray-400">|</span>
          <Link href="/dashboard/admin" className="text-sm font-medium text-blue-600 hover:text-blue-500">
            Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Report Schedules</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Schedule reports (audit, verification, properties) with email delivery
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setShowCreate(true); setError(null); closeEdit(); }}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              New schedule
            </button>
          </div>

          {showCreate && (
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Create schedule</h2>
              {renderForm(handleCreate, closeCreate)}
            </div>
          )}

          {!showCreate && !editId && error && (
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
            </div>
          )}

          {loading ? (
            <div className="px-6 py-12 text-center text-gray-500">Loading…</div>
          ) : schedules.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No schedules yet. Create one above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-500">Report</th>
                    <th className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-500">Format</th>
                    <th className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-500">Frequency</th>
                    <th className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-500">Next run</th>
                    <th className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                    <th className="px-6 py-2 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {schedules.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-900">{s.report_type}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{s.format}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {s.frequency}
                        {s.frequency === 'weekly' && s.day_of_week != null && (
                          <span className="text-gray-400"> ({DAYS_OF_WEEK[s.day_of_week]?.label})</span>
                        )}
                        {s.frequency === 'monthly' && s.day_of_month != null && (
                          <span className="text-gray-400"> (day {s.day_of_month})</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {new Date(s.next_run_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            s.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {s.enabled ? 'On' : 'Off'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => openEdit(s)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleEnabled(s)}
                          className="text-sm font-medium text-gray-600 hover:text-gray-800"
                        >
                          {s.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeliveriesId(s.id)}
                          className="text-sm font-medium text-gray-600 hover:text-gray-800"
                        >
                          Deliveries
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s.id)}
                          className="text-sm font-medium text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {editId && (
            <div className="px-6 py-4 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Edit schedule</h2>
              {renderForm(handleUpdate, closeEdit)}
            </div>
          )}
        </div>

        {deliveriesId && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Delivery history
                {scheduleForDeliveries && (
                  <span className="text-gray-500 font-normal ml-2">
                    — {scheduleForDeliveries.report_type} / {scheduleForDeliveries.format}
                  </span>
                )}
              </h2>
              <button
                type="button"
                onClick={() => setDeliveriesId(null)}
                className="text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
            </div>
            {deliveriesLoading ? (
              <div className="px-6 py-8 text-center text-gray-500">Loading…</div>
            ) : deliveries.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">No deliveries yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-500">Recipient</th>
                      <th className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                      <th className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-500">Sent</th>
                      <th className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-500">Retries</th>
                      <th className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-500">Error</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {deliveries.map((d) => (
                      <tr key={d.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm text-gray-900">{d.recipient_email}</td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                              d.status === 'sent' ? 'bg-green-100 text-green-800' :
                              d.status === 'failed' ? 'bg-red-100 text-red-800' :
                              d.status === 'retrying' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {d.sent_at ? new Date(d.sent_at).toLocaleString() : '—'}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">{d.retry_count}</td>
                        <td className="px-6 py-3 text-sm text-red-600 truncate max-w-[200px]" title={d.error_message ?? ''}>
                          {d.error_message ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
