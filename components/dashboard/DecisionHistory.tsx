'use client'

/**
 * Decision History Component
 * 
 * Displays past verification decisions from ver_verifications table
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Verification } from '@/lib/types'

export interface DecisionHistoryProps {
  initialVerifications: Verification[]
  verifierId: string
}

export default function DecisionHistory({ initialVerifications, verifierId }: DecisionHistoryProps) {
  const [verifications, setVerifications] = useState<Verification[]>(initialVerifications)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to verification changes for this verifier
    const channel = supabase
      .channel('verifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ver_verifications',
          filter: `verifier_id=eq.${verifierId}`,
        },
        (payload) => {
          console.log('Verification change:', payload)

          if (payload.eventType === 'INSERT') {
            setVerifications((prev) => [payload.new as Verification, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setVerifications((prev) =>
              prev.map((v) => (v.id === payload.new.id ? (payload.new as Verification) : v))
            )
          } else if (payload.eventType === 'DELETE') {
            setVerifications((prev) => prev.filter((v) => v.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    // Fetch verifications on mount
    fetchVerifications()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [verifierId])

  const fetchVerifications = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('ver_verifications')
        .select('*')
        .eq('verifier_id', verifierId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching verifications:', error)
      } else {
        setVerifications(data || [])
      }
    } catch (error) {
      console.error('Error fetching verifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="decision-history bg-white rounded-lg shadow border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Decision History</h2>
        <p className="text-sm text-gray-600 mt-1">Your past verification decisions</p>
      </div>

      {loading && (
        <div className="p-4 text-center text-gray-600">Loading...</div>
      )}

      {!loading && verifications.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <p>No verification decisions yet.</p>
        </div>
      )}

      {!loading && verifications.length > 0 && (
        <div className="divide-y divide-gray-200">
          {verifications.map((verification) => (
            <div key={verification.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        verification.status
                      )}`}
                    >
                      {verification.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      Document: {verification.document_id.substring(0, 8)}...
                    </span>
                  </div>
                  {verification.reason && (
                    <p className="text-sm text-gray-700 mb-2">
                      <span className="font-medium">Reason:</span> {verification.reason}
                    </p>
                  )}
                  {verification.discrepancy_metadata && (
                    <div className="text-xs text-gray-500 mt-2">
                      <span className="font-medium">Discrepancies:</span>{' '}
                      {JSON.stringify(verification.discrepancy_metadata)}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-2">
                    {formatDate(verification.created_at)}
                  </div>
                </div>
                <div className="ml-4">
                  <a
                    href={`/documents/${verification.document_id}`}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View →
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
