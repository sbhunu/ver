/**
 * System Configuration Database Operations
 * 
 * Database operations for managing system configuration settings
 */

import { createClient } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'

/**
 * Retention policy configuration
 */
export interface RetentionPolicy {
  id: string
  action_type: string | null
  retention_days: number
  archive_before_delete: boolean
  enabled: boolean
  created_at: string
  updated_at: string
}

/**
 * System configuration settings
 */
export interface SystemConfig {
  documentRetentionDays: number
  verificationTimeoutMinutes: number
  maxFileSizeMB: number
  allowedMimeTypes: string[]
  enableAutoArchival: boolean
  archiveAfterDays: number
}

/**
 * Get all retention policies
 */
export async function getRetentionPolicies(): Promise<RetentionPolicy[]> {
  const supabase = await createClient()

  const { data: policies, error } = await supabase
    .from('ver_audit_retention_policies')
    .select('*')
    .order('action_type', { ascending: true, nullsFirst: true })

  if (error || !policies) {
    return []
  }

  return policies as RetentionPolicy[]
}

/**
 * Update retention policy
 */
export async function updateRetentionPolicy(
  policyId: string,
  updates: {
    retention_days?: number
    archive_before_delete?: boolean
    enabled?: boolean
  }
): Promise<RetentionPolicy> {
  const supabase = await createClient()

  const { data: updated, error } = await supabase
    .from('ver_audit_retention_policies')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', policyId)
    .select()
    .single()

  if (error || !updated) {
    throw new DatabaseError(
      `Failed to update retention policy: ${error?.message || 'Unknown error'}`,
      error,
      { policyId, updates }
    )
  }

  return updated as RetentionPolicy
}

/**
 * Get system health metrics
 */
export async function getSystemHealthMetrics(): Promise<{
  databaseStatus: 'healthy' | 'degraded' | 'down'
  totalUsers: number
  activeUsersLast24h: number
  totalDocuments: number
  documentsProcessedLast24h: number
  totalVerifications: number
  verificationsLast24h: number
  averageVerificationTime: number
  errorRate: number
}> {
  const supabase = await createClient()

  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Get basic counts
  const [usersResult, documentsResult, verificationsResult] = await Promise.all([
    supabase.from('ver_profiles').select('id', { count: 'exact', head: false }),
    supabase.from('ver_documents').select('id, created_at', { count: 'exact', head: false }),
    supabase.from('ver_verifications').select('id, created_at', { count: 'exact', head: false }),
  ])

  const users = usersResult.data || []
  const documents = documentsResult.data || []
  const verifications = verificationsResult.data || []

  // Count active users (users with activity in last 24h)
  const { data: activeUsers } = await supabase
    .from('ver_logs')
    .select('actor_id', { count: 'exact' })
    .gte('created_at', last24h.toISOString())
    .not('actor_id', 'is', null)

  const uniqueActiveUsers = new Set(activeUsers?.map((log: any) => log.actor_id) || []).size

  // Count documents processed in last 24h
  const documentsLast24h = documents.filter(
    (doc: any) => new Date(doc.created_at) >= last24h
  ).length

  // Count verifications in last 24h
  const verificationsLast24h = verifications.filter(
    (v: any) => new Date(v.created_at) >= last24h
  ).length

  // Calculate average verification time (placeholder - would need actual timing data)
  const averageVerificationTime = 0 // Would need to track this

  // Calculate error rate (from audit logs)
  const { data: errorLogs } = await supabase
    .from('ver_logs')
    .select('id')
    .gte('created_at', last24h.toISOString())
    .contains('details', { error: true })

  const totalLogs = activeUsers?.length || 0
  const errorRate = totalLogs > 0 ? ((errorLogs?.length || 0) / totalLogs) * 100 : 0

  // Determine database status (simplified - would check actual connection health)
  const databaseStatus: 'healthy' | 'degraded' | 'down' = 'healthy'

  return {
    databaseStatus,
    totalUsers: users.length,
    activeUsersLast24h: uniqueActiveUsers,
    totalDocuments: documents.length,
    documentsProcessedLast24h: documentsLast24h,
    totalVerifications: verifications.length,
    verificationsLast24h,
    averageVerificationTime,
    errorRate,
  }
}
