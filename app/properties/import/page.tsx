/**
 * Property Import Page
 *
 * Bulk import properties from CSV/JSON. Chief_registrar and admin only.
 * Task Reference: 8.4
 */

import { requireRole } from '@/lib/auth/require-role'
import { PropertyImportView } from '@/components/properties'

export default async function PropertyImportPage() {
  const user = await requireRole('chief_registrar', '/login')
  return <PropertyImportView user={user} />
}
