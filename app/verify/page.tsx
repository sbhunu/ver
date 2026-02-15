/**
 * Verify Page
 *
 * Property-centric verification: search property, check deed/hash status,
 * upload document for verification, compare hashes. Task Reference: 7.2, 7.3
 */

import { requireRole } from '@/lib/auth/require-role'
import { VerifyPageView } from '@/components/verify'

export default async function VerifyPage() {
  const user = await requireRole('verifier', '/login')

  return (
    <VerifyPageView
      user={{ id: user.id, email: user.email ?? '', role: user.role }}
    />
  )
}
