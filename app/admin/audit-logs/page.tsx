/**
 * Audit Logs Admin Page
 * 
 * Administrator interface for viewing, filtering, and managing audit logs
 */

import { requireRole, UserRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AuditLogsViewer from '@/components/admin/AuditLogsViewer'

export const metadata = {
  title: 'Audit Logs | Admin',
  description: 'View and manage system audit logs',
}

export default async function AuditLogsPage() {
  // Require admin or chief_registrar role
  const user = await requireRole(UserRole.CHIEF_REGISTRAR, '/login')

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-gray-600 mt-2">
          View and manage system audit logs. All user actions are automatically logged.
        </p>
      </div>

      <AuditLogsViewer />
    </div>
  )
}
