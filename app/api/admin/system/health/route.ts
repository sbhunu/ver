/**
 * System Health API Route
 * 
 * Returns system health metrics
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI } from '@/lib/auth/require-role'
import { getSystemHealthMetrics } from '@/lib/db/system-config'
import { handleApiError } from '@/lib/errors'

/**
 * GET /api/admin/system/health
 * 
 * Get system health metrics
 */
export async function GET(request: NextRequest) {
  try {
    await requireRoleAPI('admin')

    const metrics = await getSystemHealthMetrics()

    return NextResponse.json({ metrics }, { status: 200 })
  } catch (error) {
    return handleApiError(error)
  }
}
