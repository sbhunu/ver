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

export default async function PropertyEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole('chief_registrar', '/login')
  const { id } = await params

  const property = await getProperty(id)
  if (!property) {
    notFound()
  }

  return <PropertyEditForm property={property} />
}
