'use client'

/**
 * System Configuration Component
 * 
 * Panel for managing application settings, document retention policies, and verification parameters
 */

import { useState, useEffect } from 'react'
import type { RetentionPolicy } from '@/lib/db/system-config'

export interface SystemConfigurationProps {
  initialPolicies: RetentionPolicy[]
}

export default function SystemConfiguration({ initialPolicies }: SystemConfigurationProps) {
  const [policies, setPolicies] = useState<RetentionPolicy[]>(initialPolicies)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleUpdatePolicy = async (policyId: string, updates: {
    retention_days?: number
    archive_before_delete?: boolean
    enabled?: boolean
  }) => {
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const response = await fetch(`/api/admin/system/retention-policies/${policyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update policy')
      }

      const updated = await response.json()
      setPolicies((prev) => prev.map((p) => (p.id === policyId ? updated.policy : p)))
      setSuccess('Policy updated successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setLoading(false)
      setTimeout(() => {
        setSuccess(null)
        setError(null)
      }, 3000)
    }
  }

  return (
    <div className="system-configuration bg-white rounded-lg shadow border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">System Configuration</h2>
        <p className="text-sm text-gray-600 mt-1">Manage application settings and retention policies</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border-b border-green-200">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {/* Retention Policies */}
      <div className="p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Audit Log Retention Policies</h3>
        <div className="space-y-4">
          {policies.map((policy) => (
            <div
              key={policy.id}
              className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {policy.action_type || 'Default Policy (All Actions)'}
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Retention: {policy.retention_days} days
                  </p>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={policy.enabled}
                    onChange={(e) =>
                      handleUpdatePolicy(policy.id, { enabled: e.target.checked })
                    }
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Enabled</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Retention Days
                  </label>
                  <input
                    type="number"
                    value={policy.retention_days}
                    onChange={(e) =>
                      handleUpdatePolicy(policy.id, {
                        retention_days: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={policy.archive_before_delete}
                      onChange={(e) =>
                        handleUpdatePolicy(policy.id, { archive_before_delete: e.target.checked })
                      }
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Archive before delete</span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Application Settings */}
      <div className="p-4 border-t border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Application Settings</h3>
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-md p-4">
            <h4 className="font-medium text-gray-900 mb-2">Document Settings</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max File Size (MB)
                </label>
                <input
                  type="number"
                  defaultValue={50}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Currently: 50 MB (configured in code)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allowed MIME Types
                </label>
                <input
                  type="text"
                  defaultValue="PDF, DOC, DOCX"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Currently: PDF, DOC, DOCX (configured in code)</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-md p-4">
            <h4 className="font-medium text-gray-900 mb-2">Verification Settings</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Timeout (minutes)
                </label>
                <input
                  type="number"
                  defaultValue={30}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Currently: 30 minutes (configured in code)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
