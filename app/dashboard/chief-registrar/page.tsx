/**
 * Chief Registrar Dashboard Page
 * 
 * Dashboard for chief registrar users with organization-wide analytics,
 * rejection analysis, and GIS map integration
 */

import { requireRole } from '@/lib/auth/require-role'
import { getOrganizationStats, getRejectionAnalysis, getDocumentsOverTime } from '@/lib/db/analytics'
import OrganizationStats from '@/components/dashboard/OrganizationStats'
import RejectionAnalysis from '@/components/dashboard/RejectionAnalysis'
import AnalyticsMap from '@/components/dashboard/AnalyticsMap'
import ExportButton from '@/components/dashboard/ExportButton'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default async function ChiefRegistrarDashboardPage() {
  // Require chief_registrar role or higher
  const user = await requireRole('chief_registrar', '/login')

  // Fetch analytics data
  const [stats, rejectionAnalysis, documentsOverTime] = await Promise.all([
    getOrganizationStats(),
    getRejectionAnalysis(),
    getDocumentsOverTime(30),
  ])

  // Prepare data for documents trend chart
  const trendData = documentsOverTime.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: item.count,
  }))

  return (
    <div className="chief-registrar-dashboard min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Chief Registrar Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">Welcome back, {user.email}</p>
            </div>
            <div className="flex gap-2">
              <ExportButton stats={stats} rejectionAnalysis={rejectionAnalysis} exportType="csv" />
              <ExportButton stats={stats} rejectionAnalysis={rejectionAnalysis} exportType="pdf" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Organization Statistics */}
        <OrganizationStats stats={stats} />

        {/* Documents Trend Chart */}
        {trendData.length > 0 && (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Documents Uploaded (Last 30 Days)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Rejection Analysis */}
        <RejectionAnalysis analysis={rejectionAnalysis} />

        {/* GIS Map Integration */}
        <AnalyticsMap height="600px" />
      </main>
    </div>
  )
}
