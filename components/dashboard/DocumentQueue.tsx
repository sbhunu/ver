'use client'

/**
 * Document Queue Component
 * 
 * Displays pending documents awaiting verification
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Document } from '@/lib/types'

export interface DocumentQueueProps {
  initialPendingDocuments: Document[]
}

export default function DocumentQueue({ initialPendingDocuments }: DocumentQueueProps) {
  const [documents, setDocuments] = useState<Document[]>(initialPendingDocuments)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to document status changes
    const channel = supabase
      .channel('pending-documents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ver_documents',
          filter: 'status=eq.pending',
        },
        (payload) => {
          console.log('Pending document change:', payload)

          if (payload.eventType === 'INSERT') {
            // Add new pending document
            setDocuments((prev) => [payload.new as Document, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            // Remove if no longer pending
            const updated = payload.new as Document
            if (updated.status !== 'pending') {
              setDocuments((prev) => prev.filter((doc) => doc.id !== updated.id))
            } else {
              // Update existing document
              setDocuments((prev) =>
                prev.map((doc) => (doc.id === updated.id ? updated : doc))
              )
            }
          } else if (payload.eventType === 'DELETE') {
            setDocuments((prev) => prev.filter((doc) => doc.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    // Fetch pending documents on mount
    fetchPendingDocuments()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchPendingDocuments = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('ver_documents')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching pending documents:', error)
      } else {
        setDocuments(data || [])
      }
    } catch (error) {
      console.error('Error fetching pending documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    } else {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    }
  }

  return (
    <div className="document-queue bg-white rounded-lg shadow border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Document Queue</h2>
        <p className="text-sm text-gray-600 mt-1">
          {documents.length} document{documents.length !== 1 ? 's' : ''} pending verification
        </p>
      </div>

      {loading && (
        <div className="p-4 text-center text-gray-600">Loading...</div>
      )}

      {!loading && documents.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <p>No documents pending verification.</p>
        </div>
      )}

      {!loading && documents.length > 0 && (
        <div className="divide-y divide-gray-200">
          {documents.map((document) => (
            <div key={document.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-gray-900">{document.filename}</h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Pending
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    <span>Property: {document.property_id ? document.property_id.substring(0, 8) + '...' : 'N/A'}</span>
                    <span className="mx-2">•</span>
                    <span>{(document.file_size / 1024).toFixed(2)} KB</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    Uploaded {getTimeAgo(document.created_at)}
                  </div>
                </div>
                <div className="ml-4">
                  <a
                    href={`/documents/${document.id}`}
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
