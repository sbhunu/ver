/**
 * Audit Logs API Route
 * 
 * Provides API endpoints for querying and managing audit logs
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI, UserRole } from '@/lib/auth'
import { getAuditLogs, getAuditLogStats, type AuditLogFilters } from '@/lib/db/audit-logs'
import { ValidationError } from '@/lib/errors'
import { z } from 'zod'

// Query parameter schema
const auditLogQuerySchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  actorId: z.string().uuid().optional(),
  action: z.enum(['upload', 'hash', 'verify', 'delete', 'export', 'login', 'logout', 'update', 'create']).optional(),
  targetType: z.string().optional(),
  targetId: z.string().uuid().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  stats: z.enum(['true', 'false']).optional(),
})

/**
 * GET /api/admin/audit-logs
 * Get audit logs with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin or chief_registrar role
    const user = await requireRoleAPI('chief_registrar')

    const { searchParams } = request.nextUrl

    // Parse and validate query parameters
    const queryParams = {
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      actorId: searchParams.get('actorId') || undefined,
      action: searchParams.get('action') || undefined,
      targetType: searchParams.get('targetType') || undefined,
      targetId: searchParams.get('targetId') || undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') || '50',
      offset: searchParams.get('offset') || '0',
      stats: searchParams.get('stats') || undefined,
    }

    const validationResult = auditLogQuerySchema.safeParse(queryParams)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validationResult.error.issues,
        },
        { status: 400 }
      )
    }

    const params = validationResult.data

    // Build filters
    const filters: AuditLogFilters = {
      dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
      dateTo: params.dateTo ? new Date(params.dateTo) : undefined,
      actorId: params.actorId,
      action: params.action,
      targetType: params.targetType as any,
      targetId: params.targetId,
      search: params.search,
      limit: params.limit,
      offset: params.offset,
    }

    // If stats requested, return statistics
    if (params.stats === 'true') {
      const stats = await getAuditLogStats({
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        actorId: filters.actorId,
        action: filters.action,
        targetType: filters.targetType,
        targetId: filters.targetId,
      })

      return NextResponse.json({
        success: true,
        data: stats,
      })
    }

    // Get audit logs
    const result = await getAuditLogs(filters)

    return NextResponse.json({
      success: true,
      data: {
        logs: result.logs,
        pagination: {
          total: result.total,
          limit: params.limit,
          offset: params.offset,
          hasMore: result.hasMore,
        },
      },
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          error: error.message,
          details: error.issues,
        },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
