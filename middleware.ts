import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { getAuthenticatedUser, createRedirect } from '@/lib/middleware/auth'
import {
  isPublicRoute,
  isAuthenticatedRoute,
  getRequiredRoles,
  getRoleDashboard,
} from '@/lib/middleware/routes'
import { ROLE_HIERARCHY } from '@/lib/auth/types'

/**
 * Next.js Middleware for authentication and route protection
 * 
 * This middleware:
 * - Refreshes Supabase auth sessions
 * - Protects routes based on authentication status
 * - Enforces role-based access control
 * - Handles redirects for unauthenticated/unauthorized users
 * - Manages session refresh and expired token handling
 * 
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always update session first (handles cookie refresh)
  const supabaseResponse = await updateSession(request)

  // Public routes - allow access without authentication
  if (isPublicRoute(pathname)) {
    return supabaseResponse
  }

  // Check if route requires authentication
  if (!isAuthenticatedRoute(pathname)) {
    // Unknown route - allow access (could be API route, static file, etc.)
    return supabaseResponse
  }

  // Get authenticated user with profile
  const user = await getAuthenticatedUser(request)

  // If not authenticated, redirect to login
  if (!user) {
    // Don't redirect if already on login page to avoid loops
    if (pathname !== '/login' && pathname !== '/signup') {
      return createRedirect(request, '/login')
    }
    return supabaseResponse
  }

  // Check role requirements for this route
  const requiredRoles = getRequiredRoles(pathname)

  if (requiredRoles) {
    // Route has role requirements - check if user has sufficient permissions
    // User has access if their role is in the required list OR
    // if their role hierarchy level is >= any required role
    const hasAccess = requiredRoles.includes(user.role) || 
      requiredRoles.some(requiredRole => 
        ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[requiredRole]
      )

    if (!hasAccess) {
      // User doesn't have required role - redirect to their dashboard
      const dashboard = getRoleDashboard(user.role)
      return createRedirect(request, dashboard)
    }
  }

  // User is authenticated and has required permissions - allow access
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - API routes (they handle their own auth)
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
