'use client'

/**
 * Assigned Documents Component
 * 
 * Displays documents assigned to the verifier (ready for verification)
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Document } from '@/lib/types'
import VerificationTools from './VerificationTools'

export interface AssignedDocumentsProps {
  initialDocuments: Document[]
}

export default function AssignedDocuments({ initialDocuments }: AssignedDocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to document status changes (hashed status = ready for verification)
    const channel = supabase
      .channel('assigned-documents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ver_documents',
          filter: 'status=eq.hashed',
        },
        (payload) => {
          console.log('Assigned document change:', payload)

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const doc = payload.new as Document
            if (doc.status === 'hashed') {
              setDocuments((prev) => {
                const exists = prev.find((d) => d.id === doc.id)
                if (exists) {
                  return prev.map((d) => (d.id === doc.id ? doc : d))
                }
                return [doc, ...prev]
              })
            } else {
              // Remove if status changed from hashed
              setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
            }
          } else if (payload.eventType === 'DELETE') {
            setDocuments((prev) => prev.filter((d) => d.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    // Fetch documents on mount
    fetchDocuments()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('ver_documents')
        .select('*')
        .eq('status', 'hashed')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching documents:', error)
      } else {
        setDocuments(data || [])
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerificationComplete = () => {
    // Remove document from list after verification
    if (selectedDocument) {
      setDocuments((prev) => prev.filter((d) => d.id !== selectedDocument.id))
      setSelectedDocument(null)
    }
    // Refresh list
    fetchDocuments()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="assigned-documents space-y-6">
      {/* Documents List */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Assigned Documents</h2>
          <p className="text-sm text-gray-600 mt-1">
            {documents.length} document{documents.length !== 1 ? 's' : ''} ready for verification
          </p>
        </div>

        {loading && (
          <div className="p-4 text-center text-gray-600">Loading...</div>
        )}

        {!loading && documents.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <p>No documents assigned for verification.</p>
          </div>
        )}

        {!loading && documents.length > 0 && (
          <div className="divide-y divide-gray-200">
            {documents.map((document) => (
              <div
                key={document.id}
                className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                  selectedDocument?.id === document.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => setSelectedDocument(document)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-medium text-gray-900">
                        {document.filename || document.original_filename || 'Untitled'}
                      </h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Ready
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      <span>Property: {document.property_id ? document.property_id.substring(0, 8) + '...' : 'N/A'}</span>
                      <span className="mx-2">•</span>
                      <span>{(document.file_size / 1024).toFixed(2)} KB</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Ready since {formatDate(document.hash_computed_at || document.created_at)}
                    </div>
                  </div>
                  <div className="ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedDocument(document)
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Verify →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verification Tools */}
      {selectedDocument && (
        <VerificationTools
          document={selectedDocument}
          onVerificationComplete={handleVerificationComplete}
        />
      )}
    </div>
  )
}
