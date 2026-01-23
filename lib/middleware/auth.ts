import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/lib/supabase/database.types'
import type { UserRoleType } from '@/lib/auth/types'
import { hasAnyRole } from '@/lib/auth/types'
import { ROLE_HIERARCHY } from '@/lib/auth/types'

/**
 * Get authenticated user with profile from request
 * 
 * @param request - Next.js request object
 * @returns User with profile or null
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<{ id: string; email: string; role: UserRoleType } | null> {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Get user from session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  // Try to refresh session if it's expired
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || (session.expires_at && session.expires_at * 1000 < Date.now())) {
      // Session expired, try to refresh
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
      if (refreshError || !refreshData.session) {
        return null
      }
    }
  } catch (error) {
    // If refresh fails, return null (user will be redirected to login)
    return null
  }

  // Get user profile with role
  const { data: profile, error: profileError } = await supabase
    .from('ver_profiles')
    .select('id, email, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return null
  }

  return {
    id: profile.id,
    email: profile.email,
    role: profile.role,
  }
}

/**
 * Check if user has required role for a route
 */
export function hasRequiredRole(
  userRole: UserRoleType,
  requiredRoles: UserRoleType[]
): boolean {
  return hasAnyRole(userRole, requiredRoles)
}

/**
 * Create redirect response
 */
export function createRedirect(request: NextRequest, path: string): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = path
  url.searchParams.set('redirectedFrom', request.nextUrl.pathname)
  return NextResponse.redirect(url)
}
