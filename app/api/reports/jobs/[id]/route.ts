/**
 * Report Job API Route (Single Job)
 * 
 * Handles individual job operations (get, update progress)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/session'
import { getReportJob } from '@/lib/db/report-jobs'
import { handleApiError } from '@/lib/errors'

/**
 * GET /api/reports/jobs/[id]
 * 
 * Get job by ID
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
    const job = await getReportJob(id, user.id)

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({ job }, { status: 200 })
  } catch (error) {
    return handleApiError(error)
  }
}
