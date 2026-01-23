'use client'

/**
 * System Health Metrics Component
 * 
 * Displays system health metrics and monitoring information
 */

import { useEffect, useState } from 'react'

export interface SystemHealthMetrics {
  databaseStatus: 'healthy' | 'degraded' | 'down'
  totalUsers: number
  activeUsersLast24h: number
  totalDocuments: number
  documentsProcessedLast24h: number
  totalVerifications: number
  verificationsLast24h: number
  averageVerificationTime: number
  errorRate: number
}

export interface SystemHealthProps {
  initialMetrics: SystemHealthMetrics
}

export default function SystemHealth({ initialMetrics }: SystemHealthProps) {
  const [metrics, setMetrics] = useState<SystemHealthMetrics>(initialMetrics)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      fetchMetrics()
    }, 60000) // Refresh every minute

    return () => clearInterval(interval)
  }, [])

  const fetchMetrics = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/system/health')
      if (response.ok) {
        const data = await response.json()
        setMetrics(data.metrics)
      }
    } catch (error) {
      console.error('Error fetching metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800'
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800'
      case 'down':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="system-health bg-white rounded-lg shadow border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">System Health</h2>
          <p className="text-sm text-gray-600 mt-1">Real-time system monitoring and metrics</p>
        </div>
        {loading && <div className="text-sm text-gray-500">Updating...</div>}
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Database Status */}
          <div className="bg-gray-50 rounded-md p-4">
            <div className="text-sm font-medium text-gray-600">Database Status</div>
            <div className="mt-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                  metrics.databaseStatus
                )}`}
              >
                {metrics.databaseStatus}
              </span>
            </div>
          </div>

          {/* Total Users */}
          <div className="bg-gray-50 rounded-md p-4">
            <div className="text-sm font-medium text-gray-600">Total Users</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{metrics.totalUsers}</div>
            <div className="text-xs text-gray-500 mt-1">
              {metrics.activeUsersLast24h} active (24h)
            </div>
          </div>

          {/* Total Documents */}
          <div className="bg-gray-50 rounded-md p-4">
            <div className="text-sm font-medium text-gray-600">Total Documents</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{metrics.totalDocuments}</div>
            <div className="text-xs text-gray-500 mt-1">
              {metrics.documentsProcessedLast24h} processed (24h)
            </div>
          </div>

          {/* Total Verifications */}
          <div className="bg-gray-50 rounded-md p-4">
            <div className="text-sm font-medium text-gray-600">Total Verifications</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{metrics.totalVerifications}</div>
            <div className="text-xs text-gray-500 mt-1">
              {metrics.verificationsLast24h} in last 24h
            </div>
          </div>

          {/* Error Rate */}
          <div className="bg-gray-50 rounded-md p-4">
            <div className="text-sm font-medium text-gray-600">Error Rate</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">
              {metrics.errorRate.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Last 24 hours</div>
          </div>

          {/* Average Verification Time */}
          <div className="bg-gray-50 rounded-md p-4">
            <div className="text-sm font-medium text-gray-600">Avg Verification Time</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">
              {metrics.averageVerificationTime > 0
                ? `${metrics.averageVerificationTime.toFixed(1)}s`
                : 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
