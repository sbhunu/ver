/**
 * Action-Specific Audit Logging Functions
 * 
 * Convenience functions for logging specific action types
 */

import { createAuditLog, extractIpAddress, extractUserAgent } from './core'
import type {
  UploadActionDetails,
  HashActionDetails,
  VerifyActionDetails,
  DeleteActionDetails,
  ExportActionDetails,
  AuthActionDetails,
} from './types'
import type { UUID, LogTargetType } from '@/lib/types'

/**
 * Log document upload action
 * 
 * @param params - Upload action parameters
 * @returns Created audit log record
 */
export async function logUpload(params: {
  actorId: UUID
  propertyId: UUID
  docNumber: string
  fileSize: number
  mimeType: string
  originalFilename: string
  storagePath: string
  hash?: string
  documentId?: UUID
  ipAddress?: string | null
  userAgent?: string | null
  headers?: Headers | Record<string, string>
}) {
  const details: UploadActionDetails = {
    property_id: params.propertyId,
    doc_number: params.docNumber,
    file_size: params.fileSize,
    mime_type: params.mimeType,
    original_filename: params.originalFilename,
    storage_path: params.storagePath,
  }

  if (params.hash) {
    details.hash = params.hash
  }

  return createAuditLog({
    actorId: params.actorId,
    action: 'upload',
    targetType: 'document',
    targetId: params.documentId || null,
    ipAddress: params.ipAddress ?? (params.headers ? extractIpAddress(params.headers) : null),
    userAgent: params.userAgent ?? (params.headers ? extractUserAgent(params.headers) : null),
    details,
  })
}

/**
 * Log hash computation action
 * 
 * @param params - Hash action parameters
 * @returns Created audit log record
 */
export async function logHash(params: {
  actorId: UUID
  documentId: UUID
  hash: string
  algorithm: string
  fileSize: number
  computationDurationMs?: number
  ipAddress?: string | null
  userAgent?: string | null
  headers?: Headers | Record<string, string>
}) {
  const details: HashActionDetails = {
    document_id: params.documentId,
    hash: params.hash,
    algorithm: params.algorithm,
    file_size: params.fileSize,
  }

  if (params.computationDurationMs !== undefined) {
    details.computation_duration_ms = params.computationDurationMs
  }

  return createAuditLog({
    actorId: params.actorId,
    action: 'hash',
    targetType: 'document',
    targetId: params.documentId,
    ipAddress: params.ipAddress ?? (params.headers ? extractIpAddress(params.headers) : null),
    userAgent: params.userAgent ?? (params.headers ? extractUserAgent(params.headers) : null),
    details,
  })
}

/**
 * Log verification action
 * 
 * @param params - Verify action parameters
 * @returns Created audit log record
 */
export async function logVerify(params: {
  actorId: UUID
  documentId: UUID
  verificationId: UUID
  status: 'verified' | 'rejected'
  verifierId: UUID
  reason?: string
  ipAddress?: string | null
  userAgent?: string | null
  headers?: Headers | Record<string, string>
}) {
  const details: VerifyActionDetails = {
    document_id: params.documentId,
    verification_id: params.verificationId,
    status: params.status,
    verifier_id: params.verifierId,
  }

  if (params.reason) {
    details.reason = params.reason
  }

  return createAuditLog({
    actorId: params.actorId,
    action: 'verify',
    targetType: 'verification',
    targetId: params.verificationId,
    ipAddress: params.ipAddress ?? (params.headers ? extractIpAddress(params.headers) : null),
    userAgent: params.userAgent ?? (params.headers ? extractUserAgent(params.headers) : null),
    details,
  })
}

/**
 * Log delete action
 * 
 * @param params - Delete action parameters
 * @returns Created audit log record
 */
export async function logDelete(params: {
  actorId: UUID
  targetType: LogTargetType
  targetId: UUID
  targetName?: string
  reason?: string
  ipAddress?: string | null
  userAgent?: string | null
  headers?: Headers | Record<string, string>
}) {
  const details: DeleteActionDetails = {
    target_type: params.targetType,
    target_id: params.targetId,
  }

  if (params.targetName) {
    details.target_name = params.targetName
  }

  if (params.reason) {
    details.reason = params.reason
  }

  return createAuditLog({
    actorId: params.actorId,
    action: 'delete',
    targetType: params.targetType,
    targetId: params.targetId,
    ipAddress: params.ipAddress ?? (params.headers ? extractIpAddress(params.headers) : null),
    userAgent: params.userAgent ?? (params.headers ? extractUserAgent(params.headers) : null),
    details,
  })
}

/**
 * Log export action
 * 
 * @param params - Export action parameters
 * @returns Created audit log record
 */
export async function logExport(params: {
  actorId: UUID
  exportType: string
  format: string
  filters?: Record<string, unknown>
  recordCount?: number
  filePath?: string
  ipAddress?: string | null
  userAgent?: string | null
  headers?: Headers | Record<string, string>
}) {
  const details: ExportActionDetails = {
    export_type: params.exportType,
    format: params.format,
  }

  if (params.filters) {
    details.filters = params.filters
  }

  if (params.recordCount !== undefined) {
    details.record_count = params.recordCount
  }

  if (params.filePath) {
    details.file_path = params.filePath
  }

  return createAuditLog({
    actorId: params.actorId,
    action: 'export',
    targetType: null,
    targetId: null,
    ipAddress: params.ipAddress ?? (params.headers ? extractIpAddress(params.headers) : null),
    userAgent: params.userAgent ?? (params.headers ? extractUserAgent(params.headers) : null),
    details,
  })
}

/**
 * Log authentication action (login/logout)
 * 
 * @param params - Auth action parameters
 * @returns Created audit log record
 */
export async function logAuth(params: {
  actorId: UUID
  action: 'login' | 'logout'
  email: string
  method?: string
  success: boolean
  failureReason?: string
  ipAddress?: string | null
  userAgent?: string | null
  headers?: Headers | Record<string, string>
}) {
  const details: AuthActionDetails = {
    email: params.email,
    success: params.success,
  }

  if (params.method) {
    details.method = params.method
  }

  if (params.failureReason) {
    details.failure_reason = params.failureReason
  }

  return createAuditLog({
    actorId: params.actorId,
    action: params.action,
    targetType: 'profile',
    targetId: params.actorId,
    ipAddress: params.ipAddress ?? (params.headers ? extractIpAddress(params.headers) : null),
    userAgent: params.userAgent ?? (params.headers ? extractUserAgent(params.headers) : null),
    details,
  })
}
