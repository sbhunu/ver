/**
 * Report Jobs Database Operations
 * 
 * Database operations for managing background report generation jobs
 */

import { createClient } from '@/lib/supabase/server'
import { DatabaseError, ValidationError } from '@/lib/errors'

/**
 * Report job
 */
export interface ReportJob {
  id: string
  user_id: string
  report_type: 'audit-logs' | 'verification-reports' | 'property-listings'
  format: 'json' | 'csv' | 'pdf'
  filters: Record<string, unknown>
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: number
  progress_message: string | null
  error_message: string | null
  result_storage_path: string | null
  estimated_completion_at: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Create a new report job
 */
export async function createReportJob(
  userId: string,
  reportType: 'audit-logs' | 'verification-reports' | 'property-listings',
  format: 'json' | 'csv' | 'pdf',
  filters: Record<string, unknown>
): Promise<ReportJob> {
  const supabase = await createClient()

  const { data: job, error } = await supabase
    .from('ver_report_jobs')
    .insert({
      user_id: userId,
      report_type: reportType,
      format: format,
      filters: filters,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    throw new DatabaseError(`Failed to create report job: ${error.message}`, error)
  }

  return job as ReportJob
}

/**
 * Get job by ID
 */
export async function getReportJob(jobId: string, userId: string): Promise<ReportJob | null> {
  const supabase = await createClient()

  const { data: job, error } = await supabase
    .from('ver_report_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new DatabaseError(`Failed to fetch job: ${error.message}`, error)
  }

  // Verify ownership
  if (job.user_id !== userId) {
    throw new ValidationError('Job not found or access denied', [
      { path: 'id', message: 'Job not found' },
    ])
  }

  return job as ReportJob
}

/**
 * Get user's jobs
 */
export async function getUserReportJobs(
  userId: string,
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
): Promise<ReportJob[]> {
  const supabase = await createClient()

  let query = supabase
    .from('ver_report_jobs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data: jobs, error } = await query

  if (error) {
    throw new DatabaseError(`Failed to fetch jobs: ${error.message}`, error)
  }

  return (jobs || []) as ReportJob[]
}

/**
 * Update job progress
 */
export async function updateJobProgress(
  jobId: string,
  progress: number,
  progressMessage?: string,
  estimatedCompletionAt?: Date
): Promise<void> {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {
    progress: Math.max(0, Math.min(100, progress)),
    updated_at: new Date().toISOString(),
  }

  if (progressMessage) {
    updateData.progress_message = progressMessage
  }

  if (estimatedCompletionAt) {
    updateData.estimated_completion_at = estimatedCompletionAt.toISOString()
  }

  const { error } = await supabase
    .from('ver_report_jobs')
    .update(updateData)
    .eq('id', jobId)

  if (error) {
    throw new DatabaseError(`Failed to update job progress: ${error.message}`, error)
  }
}

/**
 * Mark job as processing
 */
export async function startJob(jobId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('ver_report_jobs')
    .update({
      status: 'processing',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)

  if (error) {
    throw new DatabaseError(`Failed to start job: ${error.message}`, error)
  }
}

/**
 * Mark job as completed
 */
export async function completeJob(jobId: string, resultStoragePath: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('ver_report_jobs')
    .update({
      status: 'completed',
      progress: 100,
      result_storage_path: resultStoragePath,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)

  if (error) {
    throw new DatabaseError(`Failed to complete job: ${error.message}`, error)
  }
}

/**
 * Mark job as failed
 */
export async function failJob(jobId: string, errorMessage: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('ver_report_jobs')
    .update({
      status: 'failed',
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)

  if (error) {
    throw new DatabaseError(`Failed to mark job as failed: ${error.message}`, error)
  }
}

/**
 * Get pending jobs
 */
export async function getPendingJobs(limit: number = 10): Promise<ReportJob[]> {
  const supabase = await createClient()

  const { data: jobs, error } = await supabase
    .from('ver_report_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    throw new DatabaseError(`Failed to fetch pending jobs: ${error.message}`, error)
  }

  return (jobs || []) as ReportJob[]
}
