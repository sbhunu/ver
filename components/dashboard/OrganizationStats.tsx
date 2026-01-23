'use client'

/**
 * Organization Statistics Component
 * 
 * Displays organization-wide statistics from ver_documents, ver_verifications, and ver_properties
 */

import type { OrganizationStats } from '@/lib/db/analytics'

export interface OrganizationStatsProps {
  stats: OrganizationStats
}

export default function OrganizationStats({ stats }: OrganizationStatsProps) {
  return (
    <div className="organization-stats grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Documents */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="text-sm font-medium text-gray-600">Total Documents</div>
        <div className="mt-1 text-2xl font-semibold text-gray-900">{stats.totalDocuments}</div>
        <div className="mt-2 text-xs text-gray-500">
          <div>Pending: {stats.documentsByStatus.pending}</div>
          <div>Hashed: {stats.documentsByStatus.hashed}</div>
          <div>Verified: {stats.documentsByStatus.verified}</div>
          <div>Rejected: {stats.documentsByStatus.rejected}</div>
        </div>
      </div>

      {/* Total Properties */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="text-sm font-medium text-gray-600">Total Properties</div>
        <div className="mt-1 text-2xl font-semibold text-gray-900">{stats.totalProperties}</div>
        <div className="mt-2 text-xs text-gray-500">
          <div>Active: {stats.propertiesByStatus.active}</div>
          <div>Inactive: {stats.propertiesByStatus.inactive}</div>
          <div>Pending: {stats.propertiesByStatus.pending}</div>
          <div>Archived: {stats.propertiesByStatus.archived}</div>
        </div>
      </div>

      {/* Total Verifications */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="text-sm font-medium text-gray-600">Total Verifications</div>
        <div className="mt-1 text-2xl font-semibold text-gray-900">{stats.totalVerifications}</div>
        <div className="mt-2 text-xs text-gray-500">
          <div className="text-green-600">Verified: {stats.verificationsByStatus.verified}</div>
          <div className="text-red-600">Rejected: {stats.verificationsByStatus.rejected}</div>
        </div>
      </div>

      {/* Verification Rate */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="text-sm font-medium text-gray-600">Verification Rate</div>
        <div className="mt-1 text-2xl font-semibold text-gray-900">
          {stats.totalVerifications > 0
            ? ((stats.verificationsByStatus.verified / stats.totalVerifications) * 100).toFixed(1)
            : 0}
          %
        </div>
        <div className="mt-2 text-xs text-gray-500">
          {stats.verificationsByStatus.verified} of {stats.totalVerifications} verified
        </div>
      </div>
    </div>
  )
}
