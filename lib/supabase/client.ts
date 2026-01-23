import { createBrowserClient } from '@supabase/ssr'
import { Database } from './database.types'

/**
 * Creates a Supabase client for use in Client Components, Route Handlers, and Server Actions.
 * This client automatically handles cookie-based authentication for Next.js.
 * 
 * @returns Supabase client instance
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
