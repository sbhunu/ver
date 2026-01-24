/**
 * Property Edit Page
 *
 * Edit form for property (admin/chief_registrar only).
 * Task Reference: 8.2
 */

import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/require-role'
import { getProperty } from '@/lib/db'
import { PropertyEditForm } from '@/components/properties'

const ROLE_DASHBOARDS: Record<string, string> = {
  staff: '/dashboard/staff',
  verifier: '/dashboard/verifier',
  chief_registrar: '/dashboard/chief-registrar',
  admin: '/dashboard/admin',
}

export default async function PropertyEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireRole('chief_registrar', '/login')
  const { id } = await params

  const property = await getProperty(id)
  if (!property) {
    notFound()
  }

  const dashboardHref = ROLE_DASHBOARDS[user.role] ?? '/dashboard/chief-registrar'

  return (
    <PropertyEditForm
      property={property}
      dashboardHref={dashboardHref}
    />
  )
}
