/**
 * Property Management Page
 *
 * Lists all properties with search (property_no, address, owner_name), status filter,
 * sort, pagination. Per property: deeds count, Upload Deed, Hash (for pending documents).
 * Replaces the former Property Map menu item.
 */

import { requireRole } from '@/lib/auth/require-role'
import { PropertyManagementList } from '@/components/properties'

export default async function PropertyManagementPage() {
  const user = await requireRole('staff', '/login')

  return <PropertyManagementList user={user} />
}
