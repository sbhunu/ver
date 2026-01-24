/**
 * Report Builder Page
 *
 * Report type, format, filters; generate and download.
 * Chief_registrar and admin only. Task Reference: 10.1, 10.2, 10.3
 */

import { requireRole } from '@/lib/auth/require-role'
import { ReportBuilder } from '@/components/reports'

export default async function ReportsPage() {
  const user = await requireRole('chief_registrar', '/login')
  return <ReportBuilder user={user} />
}
