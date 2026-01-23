/**
 * Audit Middleware for Automatic API Logging
 * 
 * Automatically captures and logs all API calls and user actions
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAuditLog, extractIpAddress, extractUserAgent } from '@/lib/audit'
import { DatabaseError } from '@/lib/errors'
import type { ActionType, LogDetails } from '@/lib/types'

/**
 * Endpoints that should be excluded from audit logging
 */
const EXCLUDED_ENDPOINTS = [
  '/api/health',
  '/api/healthz',
  '/api/status',
  '/api/ping',
  '/api/metrics',
  '/api/_next',
  '/api/favicon.ico',
  // Static assets
  '/api/.*\\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$',
] as const

/**
 * Check if an endpoint should be excluded from audit logging
 */
export function shouldExcludeFromAudit(pathname: string): boolean {
  // Check exact matches
  if (EXCLUDED_ENDPOINTS.some(endpoint => pathname === endpoint)) {
    return true
  }

  // Check pattern matches
  for (const pattern of EXCLUDED_ENDPOINTS) {
    if (pattern.startsWith('/api/') && pattern.includes('.*')) {
      const regex = new RegExp(pattern.replace('/api/', '^/api/'))
      if (regex.test(pathname)) {
        return true
      }
    }
  }

  return false
}

/**
 * Extract user information from request
 */
async function getUserFromRequest(request: NextRequest): Promise<{
  id: string
  email: string
  role: string
} | null> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return null
    }

    // Get user profile with role
    const { data: profile, error: profileError } = await supabase
      .from('ver_profiles')
      .select('id, email, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return null
    }

    return {
      id: profile.id,
      email: profile.email,
      role: profile.role,
    }
  } catch (error) {
    // Silently fail - don't break the request if audit logging fails
    return null
  }
}

/**
 * Determine action type from HTTP method and path
 */
function getActionTypeFromRequest(
  method: string,
  pathname: string
): ActionType | null {
  // Map HTTP methods and paths to action types
  if (pathname.includes('/upload')) {
    return 'upload'
  }

  if (pathname.includes('/hash')) {
    return 'hash'
  }

  if (pathname.includes('/verify')) {
    return 'verify'
  }

  if (method === 'DELETE') {
    return 'delete'
  }

  if (pathname.includes('/export')) {
    return 'export'
  }

  if (pathname.includes('/auth/login')) {
    return 'login'
  }

  if (pathname.includes('/auth/logout')) {
    return 'logout'
  }

  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    return 'update'
  }

  if (method === 'POST' && pathname.includes('/create')) {
    return 'create'
  }

  // Default to update for POST/PUT/PATCH, null for GET
  return method === 'GET' ? null : 'update'
}

/**
 * Extract request metadata
 */
function getRequestMetadata(request: NextRequest): {
  method: string
  pathname: string
  query: Record<string, string>
  headers: Record<string, string>
  bodySize?: number
} {
  const { pathname, searchParams } = request.nextUrl
  const query: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    query[key] = value
  })

  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    headers[key] = value
  })

  return {
    method: request.method,
    pathname,
    query,
    headers,
  }
}

/**
 * Extract response metadata
 */
function getResponseMetadata(response: NextResponse): {
  status: number
  statusText: string
  headers: Record<string, string>
} {
  const headers: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    headers[key] = value
  })

  return {
    status: response.status,
    statusText: response.statusText,
    headers,
  }
}

/**
 * Create audit log entry for API request
 */
async function logApiRequest(
  request: NextRequest,
  response: NextResponse,
  user: { id: string; email: string; role: string } | null,
  actionType: ActionType | null,
  startTime: number,
  error?: Error
): Promise<void> {
  try {
    // Skip if no user and no error (public endpoint)
    if (!user && !error) {
      return
    }

    // Skip if no action type determined
    if (!actionType) {
      return
    }

    const duration = Date.now() - startTime
    const requestMetadata = getRequestMetadata(request)
    const responseMetadata = getResponseMetadata(response)

    const details: LogDetails = {
      method: requestMetadata.method,
      path: requestMetadata.pathname,
      query: requestMetadata.query,
      status: responseMetadata.status,
      statusText: responseMetadata.statusText,
      duration_ms: duration,
      request_headers: requestMetadata.headers,
      response_headers: responseMetadata.headers,
    }

    if (error) {
      details.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    }

    // Only log if we have a user or if there's an error
    if (user) {
      await createAuditLog({
        actorId: user.id,
        action: actionType,
        targetType: null,
        targetId: null,
        ipAddress: extractIpAddress(request.headers),
        userAgent: extractUserAgent(request.headers),
        details,
      })
    } else if (error) {
      // Log errors even without user (for security monitoring)
      // Use a system actor ID or skip - for now, we'll skip non-authenticated errors
      // unless they're security-related
      if (responseMetadata.status === 401 || responseMetadata.status === 403) {
        // Log security-related errors
        // Note: This requires a system user or we skip
        // For now, we'll skip to avoid requiring a system user
      }
    }
  } catch (auditError) {
    // Silently fail audit logging - don't break the request
    // In production, you might want to log this to a separate error tracking system
    console.error('Failed to create audit log:', auditError)
  }
}

/**
 * Wrap an API route handler with audit logging
 * 
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   return withAudit(request, async () => {
 *     // Your handler logic
 *     return NextResponse.json({ data: '...' })
 *   })
 * }
 * ```
 */
export async function withAudit<T extends NextResponse>(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<T>
): Promise<T> {
  const startTime = Date.now()
  const { pathname } = request.nextUrl

  // Skip excluded endpoints
  if (shouldExcludeFromAudit(pathname)) {
    return handler(request)
  }

  // Get user information
  const user = await getUserFromRequest(request)

  // Determine action type
  const actionType = getActionTypeFromRequest(request.method, pathname)

  let response: T
  let error: Error | undefined

  try {
    // Execute the handler
    response = await handler(request)
  } catch (handlerError) {
    error = handlerError instanceof Error ? handlerError : new Error(String(handlerError))
    
    // Create error response
    response = NextResponse.json(
      {
        error: error.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      },
      { status: 500 }
    ) as T
  }

  // Log the request/response (async, don't await to avoid blocking)
  logApiRequest(request, response, user, actionType, startTime, error).catch(
    (auditError) => {
      // Silently fail - don't break the request
      console.error('Audit logging failed:', auditError)
    }
  )

  return response
}

/**
 * Wrap an API route handler with audit logging and error handling
 * 
 * This version also handles errors and creates appropriate responses
 * 
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   return withAuditAndErrorHandling(request, async () => {
 *     // Your handler logic
 *     return NextResponse.json({ data: '...' })
 *   })
 * }
 * ```
 */
export async function withAuditAndErrorHandling<T extends NextResponse>(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<T>
): Promise<NextResponse> {
  return withAudit(request, handler)
}

/**
 * Create audit log for server action
 * 
 * This should be called from within server actions to log their execution
 * 
 * Usage:
 * ```typescript
 * 'use server'
 * 
 * import { logServerAction } from '@/lib/middleware/audit'
 * 
 * export async function myAction() {
 *   const user = await requireRole(UserRole.STAFF)
 *   await logServerAction('myAction', user.id, { /* details *\/ })
 *   // ... action logic
 * }
 * ```
 */
export async function logServerAction(
  actionName: string,
  actorId: string,
  details: LogDetails,
  options?: {
    ipAddress?: string | null
    userAgent?: string | null
    headers?: Headers | Record<string, string>
  }
): Promise<void> {
  try {
    // Determine action type from action name
    let actionType: ActionType = 'update'
    if (actionName.includes('upload')) {
      actionType = 'upload'
    } else if (actionName.includes('hash')) {
      actionType = 'hash'
    } else if (actionName.includes('verify')) {
      actionType = 'verify'
    } else if (actionName.includes('delete')) {
      actionType = 'delete'
    } else if (actionName.includes('export')) {
      actionType = 'export'
    } else if (actionName.includes('create')) {
      actionType = 'create'
    }

    await createAuditLog({
      actorId,
      action: actionType,
      targetType: null,
      targetId: null,
      ipAddress: options?.ipAddress ?? (options?.headers ? extractIpAddress(options.headers) : null),
      userAgent: options?.userAgent ?? (options?.headers ? extractUserAgent(options.headers) : null),
      details: {
        action_name: actionName,
        ...details,
      },
    })
  } catch (error) {
    // Silently fail - don't break the server action
    console.error('Failed to log server action:', error)
  }
}
