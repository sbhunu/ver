'use client'

/**
 * Verification Tools Component
 * 
 * Interface for verifying documents with preview, hash comparison, and decision forms
 */

import { useState } from 'react'
import type { Document } from '@/lib/types'

export interface VerificationToolsProps {
  document: Document
  onVerificationComplete?: () => void
}

export default function VerificationTools({ document, onVerificationComplete }: VerificationToolsProps) {
  const [decision, setDecision] = useState<'verified' | 'rejected' | ''>('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verificationResult, setVerificationResult] = useState<any>(null)

  const handleVerify = async () => {
    if (!decision) {
      setError('Please select a verification decision')
      return
    }

    if (decision === 'rejected' && !reason.trim()) {
      setError('Reason is required for rejected documents')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Call verification API route
      const response = await fetch('/api/verifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_id: document.id,
          status: decision,
          reason: decision === 'rejected' ? reason : null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Verification failed')
      }

      const result = await response.json()
      setVerificationResult(result.verification)

      if (onVerificationComplete) {
        onVerificationComplete()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="verification-tools bg-white rounded-lg shadow border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Verification Tools</h3>

      {/* Document Preview */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Document Information</h4>
        <div className="bg-gray-50 rounded-md p-4 space-y-2 text-sm">
          <div>
            <span className="font-medium">Filename:</span> {document.filename || document.original_filename || 'N/A'}
          </div>
          <div>
            <span className="font-medium">Size:</span> {document.file_size ? `${(document.file_size / 1024).toFixed(2)} KB` : 'N/A'}
          </div>
          <div>
            <span className="font-medium">MIME Type:</span> {document.mime_type || 'N/A'}
          </div>
          <div>
            <span className="font-medium">Status:</span>{' '}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              document.status === 'hashed' ? 'bg-blue-100 text-blue-800' :
              document.status === 'verified' ? 'bg-green-100 text-green-800' :
              document.status === 'rejected' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {document.status}
            </span>
          </div>
        </div>
      </div>

      {/* Hash Comparison Results */}
      {verificationResult && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Verification Result</h4>
          <div className="bg-gray-50 rounded-md p-4 space-y-2 text-sm">
            <div>
              <span className="font-medium">Status:</span>{' '}
              <span className={verificationResult.status === 'verified' ? 'text-green-600' : 'text-red-600'}>
                {verificationResult.status === 'verified' ? '✓ Verified' : '✗ Rejected'}
              </span>
            </div>
            {verificationResult.reason && (
              <div>
                <span className="font-medium">Reason:</span> {verificationResult.reason}
              </div>
            )}
            {verificationResult.discrepancy_metadata && (
              <div>
                <span className="font-medium">Discrepancies:</span>
                <pre className="mt-1 text-xs bg-white p-2 rounded border">
                  {JSON.stringify(verificationResult.discrepancy_metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Decision Form */}
      {document.status === 'hashed' && !verificationResult && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verification Decision
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="decision"
                  value="verified"
                  checked={decision === 'verified'}
                  onChange={(e) => setDecision(e.target.value as 'verified')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Verified</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="decision"
                  value="rejected"
                  checked={decision === 'rejected'}
                  onChange={(e) => setDecision(e.target.value as 'rejected')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Rejected</span>
              </label>
            </div>
          </div>

          {decision === 'rejected' && (
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason <span className="text-red-600">*</span>
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter reason for rejection..."
                required
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            onClick={handleVerify}
            disabled={isSubmitting}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Processing...' : 'Submit Verification'}
          </button>
        </div>
      )}

      {verificationResult && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <p className="text-sm text-green-800 font-medium">Verification completed successfully!</p>
        </div>
      )}
    </div>
  )
}
