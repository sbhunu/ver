/**
 * Audit Logs Export API Route
 * 
 * Exports audit logs to CSV or PDF format
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI } from '@/lib/auth'
import { getAuditLogs, type AuditLogFilters } from '@/lib/db/audit-logs'
import { z } from 'zod'

const exportQuerySchema = z.object({
  format: z.enum(['csv', 'pdf']).default('csv'),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  actorId: z.string().uuid().optional(),
  action: z.enum(['upload', 'hash', 'verify', 'delete', 'export', 'login', 'logout', 'update', 'create']).optional(),
  targetType: z.string().optional(),
  targetId: z.string().uuid().optional(),
})

/**
 * GET /api/admin/audit-logs/export
 * Export audit logs to CSV or PDF
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin or chief_registrar role
    const user = await requireRoleAPI('chief_registrar')

    const { searchParams } = request.nextUrl

    const queryParams = {
      format: searchParams.get('format') || 'csv',
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      actorId: searchParams.get('actorId') || undefined,
      action: searchParams.get('action') || undefined,
      targetType: searchParams.get('targetType') || undefined,
      targetId: searchParams.get('targetId') || undefined,
    }

    const validationResult = exportQuerySchema.safeParse(queryParams)
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

    // Build filters (no limit for exports)
    const filters: AuditLogFilters = {
      dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
      dateTo: params.dateTo ? new Date(params.dateTo) : undefined,
      actorId: params.actorId,
      action: params.action,
      targetType: params.targetType as any,
      targetId: params.targetId,
      limit: 10000, // Large limit for exports
      offset: 0,
    }

    // Get all audit logs
    const result = await getAuditLogs(filters)

    if (params.format === 'csv') {
      // Generate CSV
      const csvHeaders = ['ID', 'Actor ID', 'Action', 'Target Type', 'Target ID', 'IP Address', 'User Agent', 'Created At', 'Details']
      const csvRows = result.logs.map((log) => [
        log.id,
        log.actor_id,
        log.action,
        log.target_type || '',
        log.target_id || '',
        log.ip_address || '',
        log.user_agent || '',
        log.created_at,
        JSON.stringify(log.details),
      ])

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      ].join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    } else {
      // PDF export - return JSON for now (PDF generation would require a library like pdfkit or jsPDF)
      // For now, return JSON that can be converted to PDF on the client side
      return NextResponse.json(
        {
          error: 'PDF export not yet implemented. Please use CSV format.',
        },
        { status: 501 }
      )
    }
  } catch (error) {
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
