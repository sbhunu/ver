/**
 * Audit Logging Types
 * 
 * TypeScript interfaces and types for audit logging
 */

import type { ActionType, LogTargetType, LogDetails, UUID } from '@/lib/types'

/**
 * Base audit log entry parameters
 */
export interface BaseAuditLogParams {
  actorId: UUID
  targetType?: LogTargetType | null
  targetId?: UUID | null
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * Upload action details
 */
export interface UploadActionDetails extends LogDetails {
  property_id: UUID
  doc_number: string
  file_size: number
  mime_type: string
  original_filename: string
  storage_path: string
  hash?: string
}

/**
 * Hash action details
 */
export interface HashActionDetails extends LogDetails {
  document_id: UUID
  hash: string
  algorithm: string
  file_size: number
  computation_duration_ms?: number
}

/**
 * Verify action details
 */
export interface VerifyActionDetails extends LogDetails {
  document_id: UUID
  verification_id: UUID
  status: 'verified' | 'rejected'
  reason?: string
  verifier_id: UUID
}

/**
 * Delete action details
 */
export interface DeleteActionDetails extends LogDetails {
  target_type: LogTargetType
  target_id: UUID
  target_name?: string
  reason?: string
}

/**
 * Export action details
 */
export interface ExportActionDetails extends LogDetails {
  export_type: string
  format: string
  filters?: Record<string, unknown>
  record_count?: number
  file_path?: string
}

/**
 * Auth action details (login/logout)
 */
export interface AuthActionDetails extends LogDetails {
  email: string
  method?: string
  success: boolean
  failure_reason?: string
}

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
  actorId: UUID
  action: ActionType
  targetType?: LogTargetType | null
  targetId?: UUID | null
  ipAddress?: string | null
  userAgent?: string | null
  details: LogDetails
}
