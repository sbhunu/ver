/**
 * useRealtimeNotifications Hook
 * 
 * Custom hook for managing real-time notifications and system updates
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
}

export interface UseRealtimeNotificationsOptions {
  userId?: string
  onNotification?: (notification: Notification) => void
  showToasts?: boolean
}

export interface UseRealtimeNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: Error | null
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  clearNotifications: () => void
  subscribe: () => void
  unsubscribe: () => void
}

/**
 * Hook for subscribing to real-time notifications
 */
export function useRealtimeNotifications(
  options: UseRealtimeNotificationsOptions = {}
): UseRealtimeNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const channelRef = useRef<ReturnType<typeof createClient>['channel'] | null>(null)
  const supabase = createClient()

  const { userId, onNotification, showToasts = true } = options

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !n.read).length

  // Fetch initial notifications (from audit logs or a notifications table)
  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // For now, we'll create notifications from recent audit logs
      // In a production system, you'd have a dedicated notifications table
      const { data: logs, error: fetchError } = await supabase
        .from('ver_logs')
        .select('*')
        .eq('actor_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (fetchError) {
        throw fetchError
      }

      // Convert audit logs to notifications
      const newNotifications: Notification[] =
        logs?.map((log) => ({
          id: log.id,
          type: log.action === 'error' ? 'error' : 'info',
          title: `Action: ${log.action}`,
          message: JSON.stringify(log.details),
          timestamp: new Date(log.created_at),
          read: false,
        })) || []

      setNotifications(newNotifications)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch notifications'))
    } finally {
      setLoading(false)
    }
  }, [userId, supabase])

  // Subscribe to real-time changes
  const subscribe = useCallback(() => {
    if (channelRef.current || !userId) {
      return
    }

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ver_logs',
          filter: `actor_id=eq.${userId}`,
        },
        (payload) => {
          // Create notification from audit log
          const notification: Notification = {
            id: payload.new?.id || crypto.randomUUID(),
            type: payload.new?.action === 'error' ? 'error' : 'info',
            title: `Action: ${payload.new?.action || 'Unknown'}`,
            message: JSON.stringify(payload.new?.details || {}),
            timestamp: new Date(),
            read: false,
          }

          setNotifications((prev) => [notification, ...prev])

          // Show toast if enabled
          if (showToasts) {
            const toastMessage = `${notification.title}: ${notification.message.substring(0, 50)}...`
            if (notification.type === 'error') {
              toast.error(toastMessage)
            } else if (notification.type === 'success') {
              toast.success(toastMessage)
            } else if (notification.type === 'warning') {
              toast(toastMessage, { icon: '⚠️' })
            } else {
              toast(toastMessage)
            }
          }

          onNotification?.(notification)
        }
      )
      .subscribe()

    channelRef.current = channel
  }, [userId, supabase, onNotification, showToasts])

  // Unsubscribe from real-time changes
  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [supabase])

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    )
  }, [])

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  // Initialize: fetch and subscribe
  useEffect(() => {
    fetchNotifications()
    subscribe()

    return () => {
      unsubscribe()
    }
  }, [fetchNotifications, subscribe, unsubscribe])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    subscribe,
    unsubscribe,
  }
}
