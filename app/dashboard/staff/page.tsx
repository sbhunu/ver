/**
 * Staff Dashboard Page
 * 
 * Dashboard for staff users showing upload history and document queue
 */

import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/require-role'
import { getDocumentsByUploader } from '@/lib/db/documents'
import { createClient } from '@/lib/supabase/server'
import UploadHistory from '@/components/dashboard/UploadHistory'
import DocumentQueue from '@/components/dashboard/DocumentQueue'
import type { Document } from '@/lib/types'

/**
 * Get pending documents for the queue
 */
async function getPendingDocuments(): Promise<Document[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ver_documents')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) {
    console.error('Error fetching pending documents:', error)
    return []
  }

  return (data || []) as Document[]
}

export default async function StaffDashboardPage() {
  // Require staff role or higher
  const user = await requireRole('staff', '/login')

  // Fetch user's uploaded documents
  let userDocuments: Document[] = []
  try {
    userDocuments = await getDocumentsByUploader(user.id)
  } catch (error) {
    console.error('Error fetching user documents:', error)
  }

  // Fetch pending documents for the queue
  const pendingDocuments = await getPendingDocuments()

  return (
    <div className="staff-dashboard min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Staff Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Welcome back, {user.email}</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload History */}
          <div className="lg:col-span-2">
            <UploadHistory initialDocuments={userDocuments} userId={user.id} />
          </div>

          {/* Document Queue */}
          <div className="lg:col-span-2">
            <DocumentQueue initialPendingDocuments={pendingDocuments} />
          </div>
        </div>

        {/* Stats Summary */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="text-sm font-medium text-gray-600">Total Uploads</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{userDocuments.length}</div>
          </div>

          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="text-sm font-medium text-gray-600">Pending Verification</div>
            <div className="mt-1 text-2xl font-semibold text-yellow-600">{pendingDocuments.length}</div>
          </div>

          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="text-sm font-medium text-gray-600">Verified</div>
            <div className="mt-1 text-2xl font-semibold text-green-600">
              {userDocuments.filter((doc) => doc.status === 'verified').length}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
