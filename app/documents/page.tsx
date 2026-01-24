/**
 * Documents List Page
 *
 * Server wrapper: requires staff or higher, renders DocumentList with user.
 * Task Reference: 4.4
 */

import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/require-role'
import { DocumentList } from '@/components/documents'

export default async function DocumentsPage() {
  const user = await requireRole('staff', '/login')

  return <DocumentList user={user} />
}
