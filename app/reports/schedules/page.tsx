/**
 * Report Schedules Page
 *
 * List, create, edit, enable/disable, delivery history. Admin only.
 * Task Reference: 10.4
 */

import { requireRole } from '@/lib/auth/require-role'
import { ReportSchedulesView } from '@/components/reports'

export default async function ReportSchedulesPage() {
  const user = await requireRole('admin', '/login')
  return <ReportSchedulesView user={user} />
}
