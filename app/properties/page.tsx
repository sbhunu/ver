/**
 * Properties List Page
 *
 * Server wrapper: requires staff or higher, renders PropertyList with user.
 * Task Reference: 8.2
 */

import { requireRole } from '@/lib/auth/require-role'
import { PropertyList } from '@/components/properties'

export default async function PropertiesPage() {
  const user = await requireRole('staff', '/login')

  return <PropertyList user={user} />
}
