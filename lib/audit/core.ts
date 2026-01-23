/**
 * Core Audit Logging Functions
 * 
 * Base functions for creating audit log entries in ver_logs table
 */

import { createClient } from '@/lib/supabase/server'
import { DatabaseError, ValidationError } from '@/lib/errors'
import type { AuditLogInsert, ActionType, LogTargetType, LogDetails, UUID } from '@/lib/types'
import type { AuditLogEntry } from './types'

/**
 * Validate audit log entry
 */
function validateAuditLogEntry(entry: AuditLogEntry): { valid: boolean; error?: string } {
  if (!entry.actorId || typeof entry.actorId !== 'string') {
    return { valid: false, error: 'actorId is required and must be a valid UUID' }
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(entry.actorId)) {
    return { valid: false, error: 'actorId must be a valid UUID' }
  }

  if (!entry.action || typeof entry.action !== 'string') {
    return { valid: false, error: 'action is required' }
  }

  // Validate action is a valid ActionType
  const validActions: ActionType[] = ['upload', 'hash', 'verify', 'delete', 'export', 'login', 'logout', 'update', 'create']
  if (!validActions.includes(entry.action as ActionType)) {
    return { valid: false, error: `Invalid action type: ${entry.action}` }
  }

  // Validate target_id if target_type is provided
  if (entry.targetType && !entry.targetId) {
    return { valid: false, error: 'targetId is required when targetType is provided' }
  }

  // Validate target_id is UUID if provided
  if (entry.targetId && !uuidRegex.test(entry.targetId)) {
    return { valid: false, error: 'targetId must be a valid UUID' }
  }

  // Validate details is an object
  if (!entry.details || typeof entry.details !== 'object' || Array.isArray(entry.details)) {
    return { valid: false, error: 'details must be an object' }
  }

  return { valid: true }
}

/**
 * Create audit log entry in database
 * 
 * @param entry - Audit log entry data
 * @returns Created audit log record
 */
export async function createAuditLog(entry: AuditLogEntry) {
  // Validate entry
  const validation = validateAuditLogEntry(entry)
  if (!validation.valid) {
    throw new ValidationError(
      `Audit log validation failed: ${validation.error}`,
      [{ path: 'entry', message: validation.error || 'Invalid audit log entry' }]
    )
  }

  const supabase = await createClient()

  // Prepare insert data
  const insertData: AuditLogInsert = {
    actor_id: entry.actorId,
    action: entry.action as ActionType,
    target_type: entry.targetType || null,
    target_id: entry.targetId || null,
    ip_address: entry.ipAddress || null,
    user_agent: entry.userAgent || null,
    details: entry.details,
  }

  // Insert audit log
  const { data: auditLog, error } = await supabase
    .from('ver_logs')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    throw new DatabaseError(
      `Failed to create audit log: ${error.message}`,
      error,
      { entry, insertData }
    )
  }

  if (!auditLog) {
    throw new DatabaseError(
      'Audit log creation returned null',
      undefined,
      { entry, insertData }
    )
  }

  return auditLog
}

/**
 * Extract IP address from request headers
 */
export function extractIpAddress(headers: Headers | Record<string, string>): string | null {
  if (headers instanceof Headers) {
    // Check common IP header names
    const xForwardedFor = headers.get('x-forwarded-for')
    if (xForwardedFor) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      return xForwardedFor.split(',')[0].trim()
    }

    const xRealIp = headers.get('x-real-ip')
    if (xRealIp) {
      return xRealIp.trim()
    }

    const cfConnectingIp = headers.get('cf-connecting-ip')
    if (cfConnectingIp) {
      return cfConnectingIp.trim()
    }
  } else {
    // Handle Record<string, string>
    const xForwardedFor = headers['x-forwarded-for'] || headers['X-Forwarded-For']
    if (xForwardedFor) {
      return xForwardedFor.split(',')[0].trim()
    }

    const xRealIp = headers['x-real-ip'] || headers['X-Real-IP']
    if (xRealIp) {
      return xRealIp.trim()
    }

    const cfConnectingIp = headers['cf-connecting-ip'] || headers['CF-Connecting-IP']
    if (cfConnectingIp) {
      return cfConnectingIp.trim()
    }
  }

  return null
}

/**
 * Extract user agent from request headers
 */
export function extractUserAgent(headers: Headers | Record<string, string>): string | null {
  if (headers instanceof Headers) {
    return headers.get('user-agent')
  } else {
    return headers['user-agent'] || headers['User-Agent'] || null
  }
}
