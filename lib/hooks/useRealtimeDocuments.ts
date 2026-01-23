/**
 * useRealtimeDocuments Hook
 * 
 * Custom hook for managing real-time document subscriptions
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Document } from '@/lib/types'

export interface UseRealtimeDocumentsOptions {
  propertyId?: string
  uploaderId?: string
  status?: string
  onDocumentChange?: (document: Document) => void
  onDocumentInsert?: (document: Document) => void
  onDocumentUpdate?: (document: Document) => void
  onDocumentDelete?: (documentId: string) => void
}

export interface UseRealtimeDocumentsReturn {
  documents: Document[]
  loading: boolean
  error: Error | null
  subscribe: () => void
  unsubscribe: () => void
}

/**
 * Hook for subscribing to real-time document changes
 */
export function useRealtimeDocuments(
  options: UseRealtimeDocumentsOptions = {}
): UseRealtimeDocumentsReturn {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const channelRef = useRef<ReturnType<typeof createClient>['channel'] | null>(null)
  const supabase = createClient()

  const {
    propertyId,
    uploaderId,
    status,
    onDocumentChange,
    onDocumentInsert,
    onDocumentUpdate,
    onDocumentDelete,
  } = options

  // Fetch initial documents
  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase.from('ver_documents').select('*')

      if (propertyId) {
        query = query.eq('property_id', propertyId)
      }

      if (uploaderId) {
        query = query.eq('uploader_id', uploaderId)
      }

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error: fetchError } = await query.order('created_at', { ascending: false })

      if (fetchError) {
        throw fetchError
      }

      setDocuments(data || [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch documents'))
    } finally {
      setLoading(false)
    }
  }, [propertyId, uploaderId, status, supabase])

  // Subscribe to real-time changes
  const subscribe = useCallback(() => {
    if (channelRef.current) {
      return // Already subscribed
    }

    const channel = supabase
      .channel('documents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ver_documents',
          filter: propertyId ? `property_id=eq.${propertyId}` : undefined,
        },
        (payload) => {
          console.log('Document change:', payload)

          if (payload.eventType === 'INSERT' && payload.new) {
            const newDoc = payload.new as Document
            setDocuments((prev) => [newDoc, ...prev])
            onDocumentInsert?.(newDoc)
            onDocumentChange?.(newDoc)
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedDoc = payload.new as Document
            setDocuments((prev) =>
              prev.map((doc) => (doc.id === updatedDoc.id ? updatedDoc : doc))
            )
            onDocumentUpdate?.(updatedDoc)
            onDocumentChange?.(updatedDoc)
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const deletedId = (payload.old as Document).id
            setDocuments((prev) => prev.filter((doc) => doc.id !== deletedId))
            onDocumentDelete?.(deletedId)
            onDocumentChange?.(payload.old as Document)
          }

          // Refetch to ensure consistency
          fetchDocuments()
        }
      )
      .subscribe()

    channelRef.current = channel
  }, [propertyId, supabase, onDocumentChange, onDocumentInsert, onDocumentUpdate, onDocumentDelete, fetchDocuments])

  // Unsubscribe from real-time changes
  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [supabase])

  // Initialize: fetch and subscribe
  useEffect(() => {
    fetchDocuments()
    subscribe()

    return () => {
      unsubscribe()
    }
  }, [fetchDocuments, subscribe, unsubscribe])

  return {
    documents,
    loading,
    error,
    subscribe,
    unsubscribe,
  }
}
