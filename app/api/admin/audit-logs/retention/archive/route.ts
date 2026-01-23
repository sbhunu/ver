/**
 * Audit Log Archival API Route
 * 
 * Triggers archival of old audit logs based on retention policies
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI, UserRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/audit-logs/retention/archive
 * Trigger archival of old audit logs
 */
export async function POST(request: NextRequest) {
  try {
    // Require admin role
    const user = await requireRoleAPI(UserRole.ADMIN)

    const supabase = await createClient()

    // Call the archive function
    const { data, error } = await supabase.rpc('archive_old_audit_logs')

    if (error) {
      throw new Error(`Failed to archive audit logs: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      data: data?.[0] || { archived_count: 0, deleted_count: 0 },
    })
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
