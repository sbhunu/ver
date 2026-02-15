'use client'

/**
 * Property Add Form
 *
 * Form to add a new property with property_no, address, owner, and optional geometry.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
  { value: 'archived', label: 'Archived' },
]

export function PropertyAddForm() {
  const router = useRouter()
  const [propertyNo, setPropertyNo] = useState('')
  const [address, setAddress] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [registrationDate, setRegistrationDate] = useState('')
  const [status, setStatus] = useState('active')
  const [geomWkt, setGeomWkt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        property_no: propertyNo.trim(),
        address: address.trim(),
        owner_name: ownerName.trim() || null,
        registration_date: registrationDate || null,
        status,
      }
      if (geomWkt.trim()) {
        body.geom = geomWkt.trim()
      }

      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const details = data?.details?.map((d: { message?: string }) => d.message).filter(Boolean)
        throw new Error(data?.error ?? (details?.join('; ') || `HTTP ${res.status}`))
      }
      const property = data?.property
      if (property?.id) {
        router.push(`/properties/${property.id}`)
        router.refresh()
      } else {
        router.push('/properties')
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add property')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      <div>
        <label
          htmlFor="property_no"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Property Number <span className="text-red-500">*</span>
        </label>
        <input
          id="property_no"
          type="text"
          value={propertyNo}
          onChange={(e) => setPropertyNo(e.target.value)}
          required
          placeholder="e.g. HRB-2024-016"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Alphanumeric, hyphens, underscores only (e.g. HRB-2024-001)
        </p>
      </div>

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
          placeholder="e.g. 123 Jason Moyo Avenue, Harare CBD"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <label
          htmlFor="owner_name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Owner Name
        </label>
        <input
          id="owner_name"
          type="text"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          placeholder="e.g. John Doe"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <label
          htmlFor="registration_date"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Registration Date
        </label>
        <input
          id="registration_date"
          type="date"
          value={registrationDate}
          onChange={(e) => setRegistrationDate(e.target.value)}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
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
          onChange={(e) => setStatus(e.target.value)}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="geom"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Geometry (WKT, optional)
        </label>
        <textarea
          id="geom"
          rows={3}
          value={geomWkt}
          onChange={(e) => setGeomWkt(e.target.value)}
          placeholder="e.g. POLYGON((31.048 -17.828, 31.049 -17.828, 31.049 -17.829, 31.048 -17.829, 31.048 -17.828))"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono text-sm focus:border-blue-500 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          WKT format, EPSG:4326 (lon/lat). Leave empty to add geometry later.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={() => router.push('/properties/management')}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add Property'}
        </button>
      </div>
    </form>
  )
}
