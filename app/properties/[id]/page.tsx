/**
 * Property Detail Page
 *
 * Displays property metadata, geometry map, associated documents,
 * and edit link (admin/chief_registrar). Task Reference: 8.2
 */

import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/require-role'
import { getProperty, getDocumentsByProperty } from '@/lib/db'
import { PropertyDetailView } from '@/components/properties'

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireRole('staff', '/login')
  const { id } = await params

  const [property, documents] = await Promise.all([
    getProperty(id),
    getDocumentsByProperty(id),
  ])

  if (!property) {
    notFound()
  }

  return (
    <PropertyDetailView
      property={property}
      documents={documents}
      user={user}
    />
  )
}
