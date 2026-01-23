/**
 * Email Preferences Database Operations
 * 
 * Database operations for managing user email preferences and unsubscribe functionality
 */

import { createClient } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'

/**
 * Email preferences
 */
export interface EmailPreferences {
  id: string
  user_id: string
  email_unsubscribed: boolean
  unsubscribe_token: string | null
  preferred_email: string | null
  created_at: string
  updated_at: string
}

/**
 * Get email preferences for a user
 */
export async function getEmailPreferences(userId: string): Promise<EmailPreferences | null> {
  const supabase = await createClient()

  const { data: preferences, error } = await supabase
    .from('ver_email_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new DatabaseError(`Failed to fetch email preferences: ${error.message}`, error)
  }

  return preferences as EmailPreferences
}

/**
 * Create or update email preferences
 */
export async function upsertEmailPreferences(
  userId: string,
  preferences: {
    email_unsubscribed?: boolean
    preferred_email?: string | null
  }
): Promise<EmailPreferences> {
  const supabase = await createClient()

  // Get existing preferences to preserve unsubscribe_token
  const existing = await getEmailPreferences(userId)

  const updateData: Record<string, unknown> = {
    user_id: userId,
    ...preferences,
    updated_at: new Date().toISOString(),
  }

  // Generate unsubscribe token if not exists
  if (!existing?.unsubscribe_token) {
    // Generate token (in production, use crypto.randomBytes or similar)
    updateData.unsubscribe_token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  } else {
    updateData.unsubscribe_token = existing.unsubscribe_token
  }

  const { data, error } = await supabase
    .from('ver_email_preferences')
    .upsert(updateData, {
      onConflict: 'user_id',
    })
    .select()
    .single()

  if (error) {
    throw new DatabaseError(`Failed to update email preferences: ${error.message}`, error)
  }

  return data as EmailPreferences
}

/**
 * Unsubscribe user from emails using token
 */
export async function unsubscribeByToken(token: string): Promise<boolean> {
  const supabase = await createClient()

  const { data: preferences, error: fetchError } = await supabase
    .from('ver_email_preferences')
    .select('user_id')
    .eq('unsubscribe_token', token)
    .single()

  if (fetchError || !preferences) {
    return false
  }

  const { error: updateError } = await supabase
    .from('ver_email_preferences')
    .update({
      email_unsubscribed: true,
      updated_at: new Date().toISOString(),
    })
    .eq('unsubscribe_token', token)

  if (updateError) {
    throw new DatabaseError(`Failed to unsubscribe: ${updateError.message}`, updateError)
  }

  // Disable all schedules for this user
  await supabase
    .from('ver_report_schedules')
    .update({ enabled: false })
    .eq('user_id', preferences.user_id)

  return true
}

/**
 * Resubscribe user
 */
export async function resubscribe(userId: string): Promise<EmailPreferences> {
  return upsertEmailPreferences(userId, { email_unsubscribed: false })
}
