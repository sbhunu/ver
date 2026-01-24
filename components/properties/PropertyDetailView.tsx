'use client'

/**
 * Property Detail View
 *
 * Displays property metadata, geometry map, associated documents,
 * and edit action (admin/chief_registrar). Task Reference: 8.2
 */

import { useMemo } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import StatusBadge from '@/components/dashboard/StatusBadge'
import type { Property, Document } from '@/lib/types'
import type { Geometry } from 'geojson'

const PropertyGeometryMap = dynamic(
  () => import('./PropertyGeometryMap').then((m) => m.default),
  { ssr: false, loading: () => <div className="h-[400px] rounded-lg bg-gray-100 animate-pulse" /> }
)

const ROLE_DASHBOARDS: Record<string, string> = {
  staff: '/dashboard/staff',
  verifier: '/dashboard/verifier',
  chief_registrar: '/dashboard/chief-registrar',
  admin: '/dashboard/admin',
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

function geomToGeoJSON(geom: unknown): Geometry | null {
  if (!geom || typeof geom !== 'object') return null
  const g = geom as Record<string, unknown>
  if (typeof g.type !== 'string' || !Array.isArray(g.coordinates)) return null
  return { type: g.type as Geometry['type'], coordinates: g.coordinates }
}

export interface PropertyDetailViewProps {
  property: Property
  documents: Document[]
  user: { id: string; email: string; role: string }
}

export default function PropertyDetailView({
  property,
  documents,
  user,
}: PropertyDetailViewProps) {
  const dashboardHref = ROLE_DASHBOARDS[user.role] ?? '/dashboard/staff'
  const canEdit = user.role === 'admin' || user.role === 'chief_registrar'
  const geometry = useMemo(() => geomToGeoJSON(property.geom), [property.geom])
  const hasMetadata = property.metadata && Object.keys(property.metadata).length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link
            href="/properties"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            ← Properties
          </Link>
          <span className="text-gray-400">|</span>
          <Link
            href={dashboardHref}
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{property.property_no}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{property.address}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={property.status} size="lg" />
              {canEdit && (
                <Link
                  href={`/properties/${property.id}/edit`}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Edit
                </Link>
              )}
            </div>
          </div>

          <dl className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Owner</dt>
              <dd className="mt-1 text-sm text-gray-900">{property.owner_name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Area</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatArea(property.area)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Registration date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(property.registration_date)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(property.created_at).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Updated</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(property.updated_at).toLocaleString()}
              </dd>
            </div>
          </dl>

          {hasMetadata && (
            <div className="px-6 py-4 border-t border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Metadata</h2>
              <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded overflow-x-auto">
                {JSON.stringify(property.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {geometry && (
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Location</h2>
              <p className="text-sm text-gray-500 mt-0.5">Property geometry on map</p>
            </div>
            <div className="p-4">
              <PropertyGeometryMap geometry={geometry} height="400px" />
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Associated documents</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Documents linked to this property
            </p>
          </div>
          {documents.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500 text-sm">
              No documents yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Document
                    </th>
                    <th className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Uploaded
                    </th>
                    <th className="px-6 py-2 text-right text-xs font-medium uppercase text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documents.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <div className="text-sm font-medium text-gray-900">{d.doc_number}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]">
                          {d.original_filename ?? '—'}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge status={d.status} size="sm" />
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500">
                        {new Date(d.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Link
                          href={`/documents/${d.id}`}
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
