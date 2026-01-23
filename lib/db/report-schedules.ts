/**
 * Report Scheduling Database Operations
 * 
 * Database operations for managing scheduled reports
 */

import { createClient } from '@/lib/supabase/server'
import { DatabaseError, ValidationError } from '@/lib/errors'

/**
 * Report schedule
 */
export interface ReportSchedule {
  id: string
  user_id: string
  report_type: 'audit-logs' | 'verification-reports' | 'property-listings'
  format: 'json' | 'csv' | 'pdf'
  frequency: 'daily' | 'weekly' | 'monthly'
  day_of_week: number | null
  day_of_month: number | null
  time_of_day: string
  timezone: string
  filters: Record<string, unknown>
  email_recipients: string[]
  enabled: boolean
  last_run_at: string | null
  next_run_at: string
  created_at: string
  updated_at: string
}

/**
 * Report schedule insert/update
 */
export interface ReportScheduleInput {
  report_type: 'audit-logs' | 'verification-reports' | 'property-listings'
  format?: 'json' | 'csv' | 'pdf'
  frequency: 'daily' | 'weekly' | 'monthly'
  day_of_week?: number
  day_of_month?: number
  time_of_day?: string
  timezone?: string
  filters?: Record<string, unknown>
  email_recipients: string[]
  enabled?: boolean
}

/**
 * Get all schedules for a user
 */
export async function getUserSchedules(userId: string): Promise<ReportSchedule[]> {
  const supabase = await createClient()

  const { data: schedules, error } = await supabase
    .from('ver_report_schedules')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new DatabaseError(`Failed to fetch schedules: ${error.message}`, error)
  }

  return (schedules || []) as ReportSchedule[]
}

/**
 * Get schedule by ID
 */
export async function getScheduleById(scheduleId: string): Promise<ReportSchedule | null> {
  const supabase = await createClient()

  const { data: schedule, error } = await supabase
    .from('ver_report_schedules')
    .select('*')
    .eq('id', scheduleId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new DatabaseError(`Failed to fetch schedule: ${error.message}`, error)
  }

  return schedule as ReportSchedule
}

/**
 * Create a new schedule
 */
export async function createSchedule(
  userId: string,
  input: ReportScheduleInput
): Promise<ReportSchedule> {
  const supabase = await createClient()

  // Validate frequency-specific fields
  if (input.frequency === 'weekly' && input.day_of_week === undefined) {
    throw new ValidationError('day_of_week is required for weekly schedules', [
      { path: 'day_of_week', message: 'Required for weekly frequency' },
    ])
  }

  if (input.frequency === 'monthly' && input.day_of_month === undefined) {
    throw new ValidationError('day_of_month is required for monthly schedules', [
      { path: 'day_of_month', message: 'Required for monthly frequency' },
    ])
  }

  // Calculate next run time (will be done by database function, but we need initial value)
  const { data: schedule, error } = await supabase
    .from('ver_report_schedules')
    .insert({
      user_id: userId,
      report_type: input.report_type,
      format: input.format || 'pdf',
      frequency: input.frequency,
      day_of_week: input.day_of_week || null,
      day_of_month: input.day_of_month || null,
      time_of_day: input.time_of_day || '09:00:00',
      timezone: input.timezone || 'UTC',
      filters: input.filters || {},
      email_recipients: input.email_recipients,
      enabled: input.enabled !== false,
      next_run_at: new Date().toISOString(), // Will be recalculated by trigger
    })
    .select()
    .single()

  if (error) {
    throw new DatabaseError(`Failed to create schedule: ${error.message}`, error)
  }

  return schedule as ReportSchedule
}

/**
 * Update a schedule
 */
export async function updateSchedule(
  scheduleId: string,
  userId: string,
  updates: Partial<ReportScheduleInput>
): Promise<ReportSchedule> {
  const supabase = await createClient()

  // Verify ownership
  const { data: existing } = await supabase
    .from('ver_report_schedules')
    .select('user_id')
    .eq('id', scheduleId)
    .single()

  if (!existing || existing.user_id !== userId) {
    throw new ValidationError('Schedule not found or access denied', [
      { path: 'id', message: 'Schedule not found' },
    ])
  }

  const { data: schedule, error } = await supabase
    .from('ver_report_schedules')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', scheduleId)
    .select()
    .single()

  if (error) {
    throw new DatabaseError(`Failed to update schedule: ${error.message}`, error)
  }

  return schedule as ReportSchedule
}

/**
 * Delete a schedule
 */
export async function deleteSchedule(scheduleId: string, userId: string): Promise<void> {
  const supabase = await createClient()

  // Verify ownership
  const { data: existing } = await supabase
    .from('ver_report_schedules')
    .select('user_id')
    .eq('id', scheduleId)
    .single()

  if (!existing || existing.user_id !== userId) {
    throw new ValidationError('Schedule not found or access denied', [
      { path: 'id', message: 'Schedule not found' },
    ])
  }

  const { error } = await supabase.from('ver_report_schedules').delete().eq('id', scheduleId)

  if (error) {
    throw new DatabaseError(`Failed to delete schedule: ${error.message}`, error)
  }
}

/**
 * Get delivery history for a schedule
 */
export async function getScheduleDeliveries(scheduleId: string): Promise<Array<{
  id: string
  recipient_email: string
  status: string
  sent_at: string | null
  error_message: string | null
  retry_count: number
  created_at: string
}>> {
  const supabase = await createClient()

  const { data: deliveries, error } = await supabase
    .from('ver_report_deliveries')
    .select('*')
    .eq('schedule_id', scheduleId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    throw new DatabaseError(`Failed to fetch deliveries: ${error.message}`, error)
  }

  return (deliveries || []) as Array<{
    id: string
    recipient_email: string
    status: string
    sent_at: string | null
    error_message: string | null
    retry_count: number
    created_at: string
  }>
}
