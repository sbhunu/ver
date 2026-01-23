/**
 * User Management Database Operations
 * 
 * Database operations for user management (creating, updating, deactivating users)
 */

import { createClient } from '@/lib/supabase/server'
import { DatabaseError, ValidationError } from '@/lib/errors'
import type { UserRoleType } from '@/lib/auth/types'

/**
 * User profile with role
 */
export interface UserProfile {
  id: string
  email: string
  role: UserRoleType
  created_at: string
  updated_at: string
}

/**
 * User profile insert/update
 */
export interface UserProfileUpdate {
  email?: string
  role?: UserRoleType
}

/**
 * Get all users with profiles
 */
export async function getAllUsers(): Promise<UserProfile[]> {
  const supabase = await createClient()

  const { data: profiles, error } = await supabase
    .from('ver_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !profiles) {
    return []
  }

  return profiles as UserProfile[]
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<UserProfile | null> {
  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from('ver_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    return null
  }

  return profile as UserProfile
}

/**
 * Update user role
 */
export async function updateUserRole(userId: string, newRole: UserRoleType): Promise<UserProfile> {
  const supabase = await createClient()

  // Check if user exists
  const { data: existing, error: fetchError } = await supabase
    .from('ver_profiles')
    .select('id, role')
    .eq('id', userId)
    .single()

  if (fetchError || !existing) {
    throw new ValidationError(`User not found: ${userId}`, [
      { path: 'id', message: 'User does not exist' },
    ])
  }

  // Update role
  const { data: updated, error: updateError } = await supabase
    .from('ver_profiles')
    .update({ role: newRole })
    .eq('id', userId)
    .select()
    .single()

  if (updateError || !updated) {
    throw new DatabaseError(
      `Failed to update user role: ${updateError?.message || 'Unknown error'}`,
      updateError,
      { userId, newRole }
    )
  }

  return updated as UserProfile
}

/**
 * Update user email
 */
export async function updateUserEmail(userId: string, newEmail: string): Promise<UserProfile> {
  const supabase = await createClient()

  // Validate email format (basic)
  if (!newEmail || !newEmail.includes('@')) {
    throw new ValidationError('Invalid email format', [
      { path: 'email', message: 'Email must be a valid email address' },
    ])
  }

  // Check if email is already taken
  const { data: existing, error: checkError } = await supabase
    .from('ver_profiles')
    .select('id')
    .eq('email', newEmail)
    .neq('id', userId)
    .single()

  if (existing) {
    throw new ValidationError('Email already in use', [
      { path: 'email', message: 'This email is already registered' },
    ])
  }

  // Update email in profile
  const { data: updated, error: updateError } = await supabase
    .from('ver_profiles')
    .update({ email: newEmail })
    .eq('id', userId)
    .select()
    .single()

  if (updateError || !updated) {
    throw new DatabaseError(
      `Failed to update user email: ${updateError?.message || 'Unknown error'}`,
      updateError,
      { userId, newEmail }
    )
  }

  // Also update email in auth.users (requires admin client)
  // Note: This would typically be done via Supabase Admin API
  // For now, we'll just update the profile

  return updated as UserProfile
}

/**
 * Bulk update user roles
 */
export async function bulkUpdateUserRoles(
  userIds: string[],
  newRole: UserRoleType
): Promise<{ successful: number; failed: number; errors: Array<{ userId: string; error: string }> }> {
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as Array<{ userId: string; error: string }>,
  }

  for (const userId of userIds) {
    try {
      await updateUserRole(userId, newRole)
      results.successful++
    } catch (error) {
      results.failed++
      results.errors.push({
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return results
}

/**
 * Get user activity statistics
 */
export async function getUserActivityStats(userId: string, days: number = 30): Promise<{
  totalActions: number
  actionsByType: Record<string, number>
  recentActivity: Array<{ date: string; count: number }>
}> {
  const supabase = await createClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data: logs, error } = await supabase
    .from('ver_logs')
    .select('action, created_at')
    .eq('actor_id', userId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false })

  if (error || !logs) {
    return {
      totalActions: 0,
      actionsByType: {},
      recentActivity: [],
    }
  }

  // Count by action type
  const actionsByType: Record<string, number> = {}
  logs.forEach((log) => {
    actionsByType[log.action] = (actionsByType[log.action] || 0) + 1
  })

  // Group by date
  const dateCounts: Record<string, number> = {}
  logs.forEach((log) => {
    const date = new Date(log.created_at).toISOString().split('T')[0]
    dateCounts[date] = (dateCounts[date] || 0) + 1
  })

  const recentActivity = Object.entries(dateCounts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30)

  return {
    totalActions: logs.length,
    actionsByType,
    recentActivity,
  }
}
