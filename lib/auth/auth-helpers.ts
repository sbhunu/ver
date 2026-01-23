import { createClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import type { UserRoleType, AuthError } from './types'
import { hasMinimumRole, hasExactRole, hasAnyRole, ROLE_HIERARCHY } from './types'

/**
 * Type-safe wrapper for Supabase sign up
 * 
 * @param email - User email
 * @param password - User password
 * @param options - Additional sign up options
 * @returns User and session or error
 */
export async function signUp(
  email: string,
  password: string,
  options?: {
    data?: Record<string, unknown>
    redirectTo?: string
  }
) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: options?.data,
        emailRedirectTo: options?.redirectTo,
      },
    })

    if (error) {
      return {
        user: null,
        session: null,
        error: {
          message: error.message,
          type: 'auth' as const,
        } as AuthError,
      }
    }

    return {
      user: data.user,
      session: data.session,
      error: null,
    }
  } catch (error) {
    return {
      user: null,
      session: null,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error during sign up',
        type: 'unknown' as const,
      } as AuthError,
    }
  }
}

/**
 * Type-safe wrapper for Supabase sign in
 * 
 * @param email - User email
 * @param password - User password
 * @returns User and session or error
 */
export async function signIn(email: string, password: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return {
        user: null,
        session: null,
        error: {
          message: error.message,
          type: 'auth' as const,
        } as AuthError,
      }
    }

    return {
      user: data.user,
      session: data.session,
      error: null,
    }
  } catch (error) {
    return {
      user: null,
      session: null,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error during sign in',
        type: 'unknown' as const,
      } as AuthError,
    }
  }
}

/**
 * Type-safe wrapper for Supabase sign in with OTP
 * 
 * @param email - User email
 * @param options - OTP options
 * @returns Success status or error
 */
export async function signInWithOtp(
  email: string,
  options?: {
    redirectTo?: string
    shouldCreateUser?: boolean
  }
) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: options?.redirectTo,
        shouldCreateUser: options?.shouldCreateUser,
      },
    })

    if (error) {
      return {
        success: false,
        error: {
          message: error.message,
          type: 'auth' as const,
        } as AuthError,
      }
    }

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error during OTP sign in',
        type: 'unknown' as const,
      } as AuthError,
    }
  }
}

/**
 * Client-side sign up helper
 */
export const clientAuth = {
  /**
   * Sign up a new user (client-side)
   */
  async signUp(
    email: string,
    password: string,
    options?: {
      data?: Record<string, unknown>
      redirectTo?: string
    }
  ) {
    try {
      const supabase = createBrowserClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: options?.data,
          emailRedirectTo: options?.redirectTo,
        },
      })

      if (error) {
        return {
          user: null,
          session: null,
          error: {
            message: error.message,
            type: 'auth' as const,
          } as AuthError,
        }
      }

      return {
        user: data.user,
        session: data.session,
        error: null,
      }
    } catch (error) {
      return {
        user: null,
        session: null,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error during sign up',
          type: 'unknown' as const,
        } as AuthError,
      }
    }
  },

  /**
   * Sign in a user (client-side)
   */
  async signIn(email: string, password: string) {
    try {
      const supabase = createBrowserClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return {
          user: null,
          session: null,
          error: {
            message: error.message,
            type: 'auth' as const,
          } as AuthError,
        }
      }

      return {
        user: data.user,
        session: data.session,
        error: null,
      }
    } catch (error) {
      return {
        user: null,
        session: null,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error during sign in',
          type: 'unknown' as const,
        } as AuthError,
      }
    }
  },

  /**
   * Sign out the current user (client-side)
   */
  async signOut() {
    try {
      const supabase = createBrowserClient()
      const { error } = await supabase.auth.signOut()

      if (error) {
        return {
          success: false,
          error: {
            message: error.message,
            type: 'auth' as const,
          } as AuthError,
        }
      }

      return {
        success: true,
        error: null,
      }
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error during sign out',
          type: 'unknown' as const,
        } as AuthError,
      }
    }
  },
}

/**
 * Role checking utilities (re-exported from types for convenience)
 */
export { hasMinimumRole, hasExactRole, hasAnyRole, ROLE_HIERARCHY }

/**
 * Check if a user role has sufficient permissions
 * 
 * @param userRole - The user's role
 * @param requiredRole - The minimum role required
 * @returns True if user has sufficient permissions
 */
export function checkRolePermission(
  userRole: UserRoleType,
  requiredRole: UserRoleType
): boolean {
  return hasMinimumRole(userRole, requiredRole)
}

/**
 * Get role hierarchy level
 * 
 * @param role - User role
 * @returns Hierarchy level (1-4, higher = more permissions)
 */
export function getRoleLevel(role: UserRoleType): number {
  return ROLE_HIERARCHY[role]
}
