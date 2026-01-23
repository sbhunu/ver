'use client'

/**
 * Upload History Component
 * 
 * Displays user's document upload history with status and timestamps
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Document } from '@/lib/types'

export interface UploadHistoryProps {
  initialDocuments: Document[]
  userId: string
}

export default function UploadHistory({ initialDocuments, userId }: UploadHistoryProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to document changes for this user
    const channel = supabase
      .channel('documents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ver_documents',
          filter: `uploader_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Document change:', payload)

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // Refresh documents
            fetchDocuments()
          } else if (payload.eventType === 'DELETE') {
            setDocuments((prev) => prev.filter((doc) => doc.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    // Fetch documents on mount
    fetchDocuments()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('ver_documents')
        .select('*')
        .eq('uploader_id', userId)
        .order('created_at', { ascending: false })

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'hashed':
        return 'bg-blue-100 text-blue-800'
      case 'verified':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'flagged':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="upload-history bg-white rounded-lg shadow border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Upload History</h2>
        <p className="text-sm text-gray-600 mt-1">Your document uploads and their verification status</p>
      </div>

      {loading && (
        <div className="p-4 text-center text-gray-600">Loading...</div>
      )}

      {!loading && documents.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <p>No documents uploaded yet.</p>
        </div>
      )}

      {!loading && documents.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Property
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uploaded
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((document) => (
                <tr key={document.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{document.filename}</div>
                    <div className="text-xs text-gray-500">
                      {(document.file_size / 1024).toFixed(2)} KB
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {document.property_id ? document.property_id.substring(0, 8) + '...' : 'N/A'}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        document.status
                      )}`}
                    >
                      {document.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(document.created_at)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <a
                      href={`/documents/${document.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
