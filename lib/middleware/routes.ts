import type { UserRoleType } from '@/lib/auth/types'

/**
 * Route configuration for middleware protection
 */

/**
 * API routes that should be excluded from audit logging
 */
export const AUDIT_EXCLUDED_API_ROUTES = [
  '/api/health',
  '/api/healthz',
  '/api/status',
  '/api/ping',
  '/api/metrics',
] as const

/**
 * Public routes that don't require authentication
 */
export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/auth/callback',
  '/auth/confirm',
  '/api/auth',
] as const

/**
 * Routes that require authentication but any role can access
 */
export const AUTHENTICATED_ROUTES = [
  '/dashboard',
  '/profile',
  '/settings',
] as const

/**
 * Role-specific route patterns
 * Maps route patterns to required roles
 */
export const ROLE_ROUTES: Record<string, UserRoleType[]> = {
  '/dashboard/staff': ['staff', 'verifier', 'chief_registrar', 'admin'],
  '/dashboard/verifier': ['verifier', 'chief_registrar', 'admin'],
  '/dashboard/chief-registrar': ['chief_registrar', 'admin'],
  '/dashboard/admin': ['admin'],
  '/admin': ['admin'],
  '/verifier': ['verifier', 'chief_registrar', 'admin'],
  '/registrar': ['chief_registrar', 'admin'],
} as const

/**
 * Default redirect paths for each role after login
 */
export const ROLE_DASHBOARDS: Record<UserRoleType, string> = {
  staff: '/dashboard/staff',
  verifier: '/dashboard/verifier',
  chief_registrar: '/dashboard/chief-registrar',
  admin: '/dashboard/admin',
} as const

/**
 * Check if a route is public
 */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))
}

/**
 * Check if a route requires authentication
 */
export function isAuthenticatedRoute(pathname: string): boolean {
  // If it's a public route, it doesn't require auth
  if (isPublicRoute(pathname)) {
    return false
  }
  
  // Check if it matches any authenticated route pattern
  return AUTHENTICATED_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  ) || Object.keys(ROLE_ROUTES).some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )
}

/**
 * Get required roles for a route
 */
export function getRequiredRoles(pathname: string): UserRoleType[] | null {
  // Check exact matches first
  for (const [route, roles] of Object.entries(ROLE_ROUTES)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return roles
    }
  }
  
  return null
}

/**
 * Get default dashboard for a role
 */
export function getRoleDashboard(role: UserRoleType): string {
  return ROLE_DASHBOARDS[role]
}
