/**
 * Verifier Dashboard Page
 * 
 * Dashboard for verifier users with assigned documents, verification tools, and decision history
 */

import { requireRole } from '@/lib/auth/require-role'
import { getDocumentsReadyForVerification, getVerificationsByVerifier } from '@/lib/db/verifications'
import AssignedDocuments from '@/components/dashboard/AssignedDocuments'
import DecisionHistory from '@/components/dashboard/DecisionHistory'
import type { Document } from '@/lib/types'
import type { Verification } from '@/lib/types'

export default async function VerifierDashboardPage() {
  // Require verifier role or higher
  const user = await requireRole('verifier', '/login')

  // Fetch documents ready for verification
  let readyDocuments: Document[] = []
  try {
    readyDocuments = await getDocumentsReadyForVerification()
  } catch (error) {
    console.error('Error fetching ready documents:', error)
  }

  // Fetch verifier's decision history
  let verifications: Verification[] = []
  try {
    verifications = await getVerificationsByVerifier(user.id)
  } catch (error) {
    console.error('Error fetching verifications:', error)
  }

  return (
    <div className="verifier-dashboard min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Verifier Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Welcome back, {user.email}</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assigned Documents and Verification Tools */}
          <div className="lg:col-span-2">
            <AssignedDocuments initialDocuments={readyDocuments} />
          </div>

          {/* Decision History */}
          <div className="lg:col-span-1">
            <DecisionHistory initialVerifications={verifications} verifierId={user.id} />
          </div>
        </div>

        {/* Stats Summary */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="text-sm font-medium text-gray-600">Ready for Verification</div>
            <div className="mt-1 text-2xl font-semibold text-blue-600">{readyDocuments.length}</div>
          </div>

          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="text-sm font-medium text-gray-600">Total Verified</div>
            <div className="mt-1 text-2xl font-semibold text-green-600">
              {verifications.filter((v) => v.status === 'verified').length}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="text-sm font-medium text-gray-600">Total Rejected</div>
            <div className="mt-1 text-2xl font-semibold text-red-600">
              {verifications.filter((v) => v.status === 'rejected').length}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
