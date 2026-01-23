/**
 * Retention Policy API Route
 * 
 * Handles retention policy updates
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI } from '@/lib/auth/require-role'
import { updateRetentionPolicy } from '@/lib/db/system-config'
import { handleApiError } from '@/lib/errors'

/**
 * PUT /api/admin/system/retention-policies/[id]
 * 
 * Update retention policy
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRoleAPI('admin')

    const { id } = await params
    const body = await request.json()
    const { retention_days, archive_before_delete, enabled } = body

    const updates: {
      retention_days?: number
      archive_before_delete?: boolean
      enabled?: boolean
    } = {}

    if (retention_days !== undefined) {
      updates.retention_days = retention_days
    }

    if (archive_before_delete !== undefined) {
      updates.archive_before_delete = archive_before_delete
    }

    if (enabled !== undefined) {
      updates.enabled = enabled
    }

    const policy = await updateRetentionPolicy(id, updates)

    return NextResponse.json(
      {
        success: true,
        policy,
      },
      { status: 200 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}
