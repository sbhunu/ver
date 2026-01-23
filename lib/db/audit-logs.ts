/**
 * Audit Log Database Operations
 * 
 * Database operations for querying and managing audit logs
 */

import { createClient } from '@/lib/supabase/server'
import { DatabaseError, AuthorizationError } from '@/lib/errors'
import type { AuditLog, ActionType, LogTargetType, UUID } from '@/lib/types'

export interface AuditLogFilters {
  dateFrom?: Date
  dateTo?: Date
  actorId?: UUID
  action?: ActionType
  targetType?: LogTargetType
  targetId?: UUID
  search?: string // Search in JSONB details
  limit?: number
  offset?: number
}

export interface AuditLogQueryResult {
  logs: AuditLog[]
  total: number
  hasMore: boolean
}

/**
 * Get audit logs with filtering and pagination
 */
export async function getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogQueryResult> {
  const supabase = await createClient()

  // Build query
  let query = supabase
    .from('ver_logs')
    .select('*', { count: 'exact' })

  // Apply filters
  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom.toISOString())
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo.toISOString())
  }

  if (filters.actorId) {
    query = query.eq('actor_id', filters.actorId)
  }

  if (filters.action) {
    query = query.eq('action', filters.action)
  }

  if (filters.targetType) {
    query = query.eq('target_type', filters.targetType)
  }

  if (filters.targetId) {
    query = query.eq('target_id', filters.targetId)
  }

  // Search in JSONB details using PostgreSQL text search
  if (filters.search) {
    // Use PostgreSQL's text search on JSONB
    // This searches all text values in the details JSONB
    query = query.or(`details::text.ilike.%${filters.search}%`)
  }

  // Order by created_at descending (newest first)
  query = query.order('created_at', { ascending: false })

  // Apply pagination
  const limit = filters.limit || 50
  const offset = filters.offset || 0
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    throw new DatabaseError(
      `Failed to fetch audit logs: ${error.message}`,
      error
    )
  }

  return {
    logs: (data || []) as AuditLog[],
    total: count || 0,
    hasMore: (count || 0) > (offset + limit),
  }
}

/**
 * Get audit log by ID
 */
export async function getAuditLogById(id: UUID): Promise<AuditLog | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ver_logs')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null
    }
    throw new DatabaseError(
      `Failed to fetch audit log: ${error.message}`,
      error
    )
  }

  return data as AuditLog
}

/**
 * Get audit logs for a specific user
 */
export async function getAuditLogsByActor(actorId: UUID, limit: number = 50): Promise<AuditLog[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ver_logs')
    .select('*')
    .eq('actor_id', actorId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new DatabaseError(
      `Failed to fetch audit logs for actor: ${error.message}`,
      error
    )
  }

  return (data || []) as AuditLog[]
}

/**
 * Get audit logs for a specific target
 */
export async function getAuditLogsByTarget(
  targetType: LogTargetType,
  targetId: UUID,
  limit: number = 50
): Promise<AuditLog[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ver_logs')
    .select('*')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new DatabaseError(
      `Failed to fetch audit logs for target: ${error.message}`,
      error
    )
  }

  return (data || []) as AuditLog[]
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(filters: Omit<AuditLogFilters, 'limit' | 'offset' | 'search'> = {}) {
  const supabase = await createClient()

  // Build base query
  let query = supabase
    .from('ver_logs')
    .select('action, created_at', { count: 'exact' })

  // Apply filters
  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom.toISOString())
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo.toISOString())
  }

  if (filters.actorId) {
    query = query.eq('actor_id', filters.actorId)
  }

  if (filters.action) {
    query = query.eq('action', filters.action)
  }

  if (filters.targetType) {
    query = query.eq('target_type', filters.targetType)
  }

  if (filters.targetId) {
    query = query.eq('target_id', filters.targetId)
  }

  const { data, error, count } = await query

  if (error) {
    throw new DatabaseError(
      `Failed to fetch audit log statistics: ${error.message}`,
      error
    )
  }

  // Calculate statistics
  const actionCounts: Record<string, number> = {}
  const logs = (data || []) as Array<{ action: ActionType; created_at: string }>

  logs.forEach((log) => {
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1
  })

  return {
    total: count || 0,
    byAction: actionCounts,
  }
}
