'use client'

/**
 * Property Edit Form
 *
 * Form to update property (address, owner, status, registration date).
 * Admin/chief_registrar only. Task Reference: 8.2
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Property } from '@/lib/types'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
  { value: 'archived', label: 'Archived' },
]

export interface PropertyEditFormProps {
  property: Property
  dashboardHref: string
}

export default function PropertyEditForm({
  property,
  dashboardHref,
}: PropertyEditFormProps) {
  const router = useRouter()
  const [address, setAddress] = useState(property.address)
  const [ownerName, setOwnerName] = useState(property.owner_name ?? '')
  const [status, setStatus] = useState(property.status)
  const [registrationDate, setRegistrationDate] = useState(
    property.registration_date ? property.registration_date.slice(0, 10) : ''
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/properties/${property.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address.trim() || undefined,
          owner_name: ownerName.trim() || null,
          status,
          registration_date: registrationDate || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error ?? `HTTP ${res.status}`)
      }
      router.push(`/properties/${property.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link
            href={`/properties/${property.id}`}
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            ← Property
          </Link>
          <span className="text-gray-400">|</span>
          <Link
            href="/properties"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            Properties
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
            <h1 className="text-2xl font-bold text-gray-900">Edit property</h1>
            <p className="text-sm text-gray-500 mt-0.5">{property.property_no}</p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            )}

            <div>
              <label
                htmlFor="address"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Address <span className="text-red-500">*</span>
              </label>
              <input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="owner"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Owner name
              </label>
              <input
                id="owner"
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as Property['status'])}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="registrationDate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Registration date
              </label>
              <input
                id="registrationDate"
                type="date"
                value={registrationDate}
                onChange={(e) => setRegistrationDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving…' : 'Save'}
              </button>
              <Link
                href={`/properties/${property.id}`}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
