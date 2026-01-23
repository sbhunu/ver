import { createClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import type { Session, User, UserProfile, AuthenticatedUser, AuthError } from './types'

/**
 * Get the current session from the server
 * 
 * @returns Current session or null if not authenticated
 */
export async function getSession(): Promise<Session | null> {
  try {
    const supabase = await createClient()
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      console.error('Error getting session:', error)
      return null
    }

    return session
  } catch (error) {
    console.error('Unexpected error getting session:', error)
    return null
  }
}

/**
 * Get the current user from the server
 * 
 * @returns Current user or null if not authenticated
 */
export async function getUser(): Promise<User | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.error('Error getting user:', error)
      return null
    }

    return user
  } catch (error) {
    console.error('Unexpected error getting user:', error)
    return null
  }
}

/**
 * Get the current user with profile from the server
 * 
 * @returns Authenticated user with profile or null if not authenticated
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return null
    }

    const { data: profile, error: profileError } = await supabase
      .from('ver_profiles')
      .select('id, email, role, created_at, updated_at')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return null
    }

    return {
      ...user,
      profile,
    }
  } catch (error) {
    console.error('Unexpected error getting authenticated user:', error)
    return null
  }
}

/**
 * Get user profile by user ID
 * 
 * @param userId - User ID to fetch profile for
 * @returns User profile or null if not found
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const supabase = await createClient()
    const { data: profile, error } = await supabase
      .from('ver_profiles')
      .select('id, email, role, created_at, updated_at')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      return null
    }

    return profile
  } catch (error) {
    console.error('Unexpected error getting user profile:', error)
    return null
  }
}

/**
 * Refresh the current session
 * 
 * @returns Refreshed session or null if refresh failed
 */
export async function refreshSession(): Promise<Session | null> {
  try {
    const supabase = await createClient()
    const {
      data: { session },
      error,
    } = await supabase.auth.refreshSession()

    if (error) {
      console.error('Error refreshing session:', error)
      return null
    }

    return session
  } catch (error) {
    console.error('Unexpected error refreshing session:', error)
    return null
  }
}

/**
 * Sign out the current user (server-side)
 * 
 * @returns True if sign out was successful
 */
export async function signOut(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Error signing out:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Unexpected error signing out:', error)
    return false
  }
}

/**
 * Browser/client-side session management
 */
export const clientSession = {
  /**
   * Get the current session from the browser
   */
  async getSession(): Promise<Session | null> {
    try {
      const supabase = createBrowserClient()
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        console.error('Error getting session:', error)
        return null
      }

      return session
    } catch (error) {
      console.error('Unexpected error getting session:', error)
      return null
    }
  },

  /**
   * Get the current user from the browser
   */
  async getUser(): Promise<User | null> {
    try {
      const supabase = createBrowserClient()
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error) {
        console.error('Error getting user:', error)
        return null
      }

      return user
    } catch (error) {
      console.error('Unexpected error getting user:', error)
      return null
    }
  },

  /**
   * Sign out the current user (client-side)
   */
  async signOut(): Promise<boolean> {
    try {
      const supabase = createBrowserClient()
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('Error signing out:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Unexpected error signing out:', error)
      return false
    }
  },
}
