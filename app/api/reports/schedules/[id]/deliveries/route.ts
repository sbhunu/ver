/**
 * Report Schedule Deliveries API Route
 * 
 * Handles delivery history for a schedule
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/session'
import { getScheduleById, getScheduleDeliveries } from '@/lib/db/report-schedules'
import { handleApiError } from '@/lib/errors'

/**
 * GET /api/reports/schedules/[id]/deliveries
 * 
 * Get delivery history for a schedule
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify schedule ownership
    const schedule = await getScheduleById(id)
    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    if (schedule.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const deliveries = await getScheduleDeliveries(id)

    return NextResponse.json({ deliveries }, { status: 200 })
  } catch (error) {
    return handleApiError(error)
  }
}
