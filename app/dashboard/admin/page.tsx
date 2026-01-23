/**
 * Admin Dashboard Page
 * 
 * Dashboard for admin users with user management, system configuration, and audit log monitoring
 */

import { requireRole } from '@/lib/auth/require-role'
import { getAllUsers } from '@/lib/db/users'
import { getRetentionPolicies, getSystemHealthMetrics } from '@/lib/db/system-config'
import UserManagement from '@/components/dashboard/UserManagement'
import SystemConfiguration from '@/components/dashboard/SystemConfiguration'
import SystemHealth from '@/components/dashboard/SystemHealth'
import AuditLogsViewer from '@/components/admin/AuditLogsViewer'
import type { UserProfile } from '@/lib/db/users'
import type { RetentionPolicy } from '@/lib/db/system-config'

export default async function AdminDashboardPage() {
  // Require admin role
  const user = await requireRole('admin', '/login')

  // Fetch dashboard data
  const [users, policies, healthMetrics] = await Promise.all([
    getAllUsers(),
    getRetentionPolicies(),
    getSystemHealthMetrics(),
  ])

  return (
    <div className="admin-dashboard min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Welcome back, {user.email}</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* System Health Metrics */}
        <SystemHealth initialMetrics={healthMetrics} />

        {/* User Management */}
        <UserManagement initialUsers={users} />

        {/* System Configuration */}
        <SystemConfiguration initialPolicies={policies} />

        {/* Audit Logs */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Audit Logs</h2>
            <p className="text-sm text-gray-600 mt-1">View and manage system audit logs</p>
          </div>
          <div className="p-4">
            <AuditLogsViewer />
          </div>
        </div>
      </main>
    </div>
  )
}
