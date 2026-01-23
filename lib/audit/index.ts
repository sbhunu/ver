/**
 * Audit Logging Module
 * 
 * Comprehensive audit logging for all user actions with structured data
 */

// Core functions
export { createAuditLog, extractIpAddress, extractUserAgent } from './core'

// Action-specific functions
export {
  logUpload,
  logHash,
  logVerify,
  logDelete,
  logExport,
  logAuth,
} from './actions'

// Types
export type {
  BaseAuditLogParams,
  UploadActionDetails,
  HashActionDetails,
  VerifyActionDetails,
  DeleteActionDetails,
  ExportActionDetails,
  AuthActionDetails,
  AuditLogEntry,
} from './types'
