/**
 * Audit Log Retention Management API Route
 * 
 * Manages retention policies and archival operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI, UserRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const retentionPolicySchema = z.object({
  actionType: z.enum(['upload', 'hash', 'verify', 'delete', 'export', 'login', 'logout', 'update', 'create']).nullable(),
  retentionDays: z.number().int().min(1).max(3650),
  archiveBeforeDelete: z.boolean().default(true),
  enabled: z.boolean().default(true),
})

/**
 * GET /api/admin/audit-logs/retention
 * Get retention policies
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin role
    const user = await requireRoleAPI(UserRole.ADMIN)

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('ver_audit_retention_policies')
      .select('*')
      .order('action_type', { ascending: true, nullsFirst: true })

    if (error) {
      throw new Error(`Failed to fetch retention policies: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      data: data || [],
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

/**
 * POST /api/admin/audit-logs/retention
 * Create or update retention policy
 */
export async function POST(request: NextRequest) {
  try {
    // Require admin role
    const user = await requireRoleAPI(UserRole.ADMIN)

    const body = await request.json()
    const validationResult = retentionPolicySchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validationResult.error.issues,
        },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('ver_audit_retention_policies')
      .upsert({
        action_type: validationResult.data.actionType,
        retention_days: validationResult.data.retentionDays,
        archive_before_delete: validationResult.data.archiveBeforeDelete,
        enabled: validationResult.data.enabled,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'action_type',
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to save retention policy: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      data,
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

/**
 * PUT /api/admin/audit-logs/retention
 * Update retention policy
 */
export async function PUT(request: NextRequest) {
  return POST(request)
}
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
