/**
 * Report Schedule API Route (Single Schedule)
 * 
 * Handles individual schedule operations (get, update, delete)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/session'
import { getScheduleById, updateSchedule, deleteSchedule } from '@/lib/db/report-schedules'
import { handleApiError } from '@/lib/errors'

/**
 * GET /api/reports/schedules/[id]
 * 
 * Get schedule by ID
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
    const schedule = await getScheduleById(id)

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    if (schedule.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ schedule }, { status: 200 })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * PUT /api/reports/schedules/[id]
 * 
 * Update schedule
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const schedule = await updateSchedule(id, user.id, body)

    return NextResponse.json({ schedule }, { status: 200 })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * DELETE /api/reports/schedules/[id]
 * 
 * Delete schedule
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    await deleteSchedule(id, user.id)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    return handleApiError(error)
  }
}
