/**
 * Report Jobs API Route
 * 
 * Handles report job management (list, create)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/session'
import { getUserReportJobs, createReportJob } from '@/lib/db/report-jobs'
import { handleApiError } from '@/lib/errors'

/**
 * GET /api/reports/jobs
 * 
 * Get all jobs for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const status = url.searchParams.get('status') as
      | 'pending'
      | 'processing'
      | 'completed'
      | 'failed'
      | 'cancelled'
      | null

    const jobs = await getUserReportJobs(user.id, status || undefined)

    return NextResponse.json({ jobs }, { status: 200 })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/reports/jobs
 * 
 * Create a new report job
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { report_type, format, filters } = body

    if (!report_type || !format) {
      return NextResponse.json(
        { error: 'report_type and format are required' },
        { status: 400 }
      )
    }

    const job = await createReportJob(user.id, report_type, format, filters || {})

    return NextResponse.json({ job }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
