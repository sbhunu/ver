/**
 * Document Detail Page
 *
 * Displays document metadata, hash history, verification history,
 * timeline, and download link. Task Reference: 4.4, 4.5
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/require-role'
import {
  getDocument,
  getDocumentHashes,
  getVerificationsByDocument,
  getProperty,
} from '@/lib/db'
import StatusBadge from '@/components/dashboard/StatusBadge'
import type { Document, DocumentHash, Verification } from '@/lib/types'

function formatDate(s: string) {
  return new Date(s).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatFileSize(bytes: number | null) {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

type TimelineEvent =
  | { type: 'upload'; at: string; label: string }
  | { type: 'hash'; at: string; label: string }
  | { type: 'verification'; at: string; label: string; status: string }

function buildTimeline(
  doc: Document,
  hashes: DocumentHash[],
  verifications: Verification[]
): TimelineEvent[] {
  const events: TimelineEvent[] = []

  events.push({
    type: 'upload',
    at: doc.created_at,
    label: 'Document uploaded',
  })

  if (doc.hash_computed_at) {
    events.push({
      type: 'hash',
      at: doc.hash_computed_at,
      label: 'Hash computed',
    })
  } else if (hashes.length > 0) {
    const first = hashes[0]
    events.push({
      type: 'hash',
      at: first.created_at,
      label: 'Hash computed',
    })
  }

  for (const v of verifications) {
    events.push({
      type: 'verification',
      at: v.created_at,
      label: v.status === 'verified' ? 'Verified' : 'Rejected',
      status: v.status,
    })
  }

  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  return events
}

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireRole('staff', '/login')
  const { id } = await params

  const [document, hashes, verifications] = await Promise.all([
    getDocument(id),
    getDocumentHashes(id),
    getVerificationsByDocument(id),
  ])

  if (!document) {
    notFound()
  }

  const property = await getProperty(document.property_id)
  const timeline = buildTimeline(document, hashes, verifications)

  const dashboardHref =
    {
      staff: '/dashboard/staff',
      verifier: '/dashboard/verifier',
      chief_registrar: '/dashboard/chief-registrar',
      admin: '/dashboard/admin',
    }[user.role] ?? '/dashboard/staff'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link
            href="/documents"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            ← Documents
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
              <h1 className="text-2xl font-bold text-gray-900">
                {document.doc_number}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {document.original_filename ?? '—'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={document.status} size="lg" />
              <a
                href={`/api/documents/${id}/download`}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Download
              </a>
            </div>
          </div>

          {/* Metadata */}
          <dl className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Property</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {property ? (
                  <Link
                    href={`/properties/${property.id}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {property.property_no}
                    {property.owner_name ? ` — ${property.owner_name}` : ''}
                  </Link>
                ) : (
                  <span className="text-gray-500">{document.property_id.slice(0, 8)}…</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">File size</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatFileSize(document.file_size)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">MIME type</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {document.mime_type ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Uploaded</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(document.created_at)}
              </dd>
            </div>
            {document.hash_computed_at && (
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Hash computed</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(document.hash_computed_at)}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Timeline */}
        {timeline.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Timeline</h2>
            </div>
            <ul className="px-6 py-4 space-y-4">
              {timeline.map((evt, i) => (
                <li key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        evt.type === 'upload'
                          ? 'bg-gray-400'
                          : evt.type === 'hash'
                            ? 'bg-blue-500'
                            : evt.status === 'verified'
                              ? 'bg-green-500'
                              : 'bg-red-500'
                      }`}
                    />
                    {i < timeline.length - 1 && (
                      <div className="w-px flex-1 min-h-[1rem] bg-gray-200 mt-1" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium text-gray-900">{evt.label}</p>
                    <p className="text-xs text-gray-500">{formatDate(evt.at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Hash history */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Hash history</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              SHA-256 hashes recorded for this document
            </p>
          </div>
          {hashes.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500 text-sm">
              No hashes recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Algorithm
                    </th>
                    <th className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Hash
                    </th>
                    <th className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {hashes.map((h) => (
                    <tr key={h.id}>
                      <td className="px-6 py-3 text-sm text-gray-900">{h.algorithm}</td>
                      <td className="px-6 py-3 text-sm font-mono text-gray-700 truncate max-w-[280px]">
                        {h.sha256_hash}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500">
                        {formatDate(h.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Verification history */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Verification history</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Verification decisions for this document
            </p>
          </div>
          {verifications.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500 text-sm">
              No verifications yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Reason
                    </th>
                    <th className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {verifications.map((v) => (
                    <tr key={v.id}>
                      <td className="px-6 py-3">
                        <StatusBadge status={v.status} size="sm" />
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700">
                        {v.reason ?? '—'}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500">
                        {formatDate(v.created_at)}
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
