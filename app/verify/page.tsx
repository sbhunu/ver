/**
 * Verify Page
 *
 * Dedicated verification UI: document selection, file upload for hash comparison,
 * verification decision form, batch verification. Task Reference: 7.2, 7.3
 */

import { requireRole } from '@/lib/auth/require-role'
import { getDocumentsReadyForVerification } from '@/lib/db/verifications'
import { VerifyPageView } from '@/components/verify'

export default async function VerifyPage() {
  const user = await requireRole('verifier', '/login')

  let documents: Array<{
    id: string
    doc_number: string
    original_filename: string | null
    file_size: number | null
    status: string
  }> = []
  try {
    const ready = await getDocumentsReadyForVerification()
    documents = ready.map((d: { id: string; doc_number: string; original_filename: string | null; file_size: number | null; status: string }) => ({
      id: d.id,
      doc_number: d.doc_number,
      original_filename: d.original_filename ?? null,
      file_size: d.file_size ?? null,
      status: d.status,
    }))
  } catch (e) {
    console.error('Error fetching documents for verification:', e)
  }

  return (
    <VerifyPageView
      documents={documents}
      user={{ id: user.id, email: user.email ?? '', role: user.role }}
    />
  )
}
