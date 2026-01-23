/**
 * Report Schedules API Route
 * 
 * Handles report schedule management (list, create)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI } from '@/lib/auth/require-role'
import { getUserSchedules, createSchedule } from '@/lib/db/report-schedules'
import { handleApiError } from '@/lib/errors'
import { getAuthenticatedUser } from '@/lib/auth/session'

/**
 * GET /api/reports/schedules
 * 
 * Get all schedules for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schedules = await getUserSchedules(user.id)

    return NextResponse.json({ schedules }, { status: 200 })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/reports/schedules
 * 
 * Create a new schedule
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const schedule = await createSchedule(user.id, body)

    return NextResponse.json({ schedule }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
