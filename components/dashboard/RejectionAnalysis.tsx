'use client'

/**
 * Rejection Analysis Component
 * 
 * Displays rejection causes analysis with charts showing verification failure patterns
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import type { RejectionAnalysis } from '@/lib/db/analytics'

export interface RejectionAnalysisProps {
  analysis: RejectionAnalysis
}

const COLORS = ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef']

export default function RejectionAnalysis({ analysis }: RejectionAnalysisProps) {
  // Prepare data for charts
  const reasonData = analysis.rejectionsByReason.slice(0, 10).map((item) => ({
    name: item.reason.length > 30 ? item.reason.substring(0, 30) + '...' : item.reason,
    fullName: item.reason,
    count: item.count,
    percentage: item.percentage,
  }))

  const timeData = analysis.rejectionsOverTime.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: item.count,
  }))

  const verifierData = analysis.rejectionsByVerifier.slice(0, 10).map((item) => ({
    name: item.verifier_email.split('@')[0],
    fullEmail: item.verifier_email,
    count: item.count,
  }))

  return (
    <div className="rejection-analysis bg-white rounded-lg shadow border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Rejection Analysis</h2>

      {analysis.totalRejections === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No rejections to analyze.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-red-50 rounded-md p-4">
              <div className="text-sm font-medium text-red-800">Total Rejections</div>
              <div className="mt-1 text-2xl font-semibold text-red-900">{analysis.totalRejections}</div>
            </div>
            <div className="bg-orange-50 rounded-md p-4">
              <div className="text-sm font-medium text-orange-800">Unique Reasons</div>
              <div className="mt-1 text-2xl font-semibold text-orange-900">
                {analysis.rejectionsByReason.length}
              </div>
            </div>
            <div className="bg-yellow-50 rounded-md p-4">
              <div className="text-sm font-medium text-yellow-800">Verifiers Involved</div>
              <div className="mt-1 text-2xl font-semibold text-yellow-900">
                {analysis.rejectionsByVerifier.length}
              </div>
            </div>
          </div>

          {/* Rejections by Reason - Bar Chart */}
          {reasonData.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Rejections by Reason</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reasonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => [value, 'Count']}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                  />
                  <Bar dataKey="count" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Rejections Over Time */}
          {timeData.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Rejections Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Rejections by Verifier */}
          {verifierData.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Rejections by Verifier</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={verifierData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => [value, 'Rejections']}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullEmail || label}
                  />
                  <Bar dataKey="count" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Rejection Reasons - Pie Chart */}
          {reasonData.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Top Rejection Reasons</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={reasonData.slice(0, 5)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {reasonData.slice(0, 5).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
