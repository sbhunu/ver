/**
 * Supabase Admin Client
 *
 * Uses the service role key to bypass RLS. Use only in server-side code
 * for operations that require elevated permissions (e.g. inserting into
 * ver_document_hashes, which has no INSERT policy for authenticated users).
 */

import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
        'Add SUPABASE_SERVICE_ROLE_KEY to .env.local (get it from `supabase status`).'
    )
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  })
}
