import { createClient } from '@/lib/supabase/server'
import type { UserRoleType } from './types'
import { UserRole, ROLE_HIERARCHY } from './types'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'

/**
 * Authentication error types
 */
export class AuthenticationError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  constructor(message: string, public statusCode: number = 403) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

/**
 * Extract role from JWT claims (user_metadata or app_metadata)
 * Falls back to database lookup if not in JWT
 */
async function extractRoleFromJWT(
  user: { id: string; user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> },
  supabase: ReturnType<typeof createClient>
): Promise<UserRoleType | null> {
  // Try to get role from JWT claims (user_metadata or app_metadata)
  // Supabase can store custom claims in these fields
  const roleFromMetadata = 
    (user.user_metadata?.role as UserRoleType) ||
    (user.app_metadata?.role as UserRoleType)

  if (roleFromMetadata && ['staff', 'verifier', 'chief_registrar', 'admin'].includes(roleFromMetadata)) {
    return roleFromMetadata
  }

  // Fallback to database lookup
  const { data: profile } = await supabase
    .from('ver_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role || null
}

/**
 * Get authenticated user with role from JWT or database
 */
async function getAuthenticatedUserWithRole(): Promise<{
  id: string
  email: string
  role: UserRoleType
} | null> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  // Extract role from JWT or database
  const role = await extractRoleFromJWT(user, supabase)

  if (!role) {
    return null
  }

  return {
    id: user.id,
    email: user.email || '',
    role,
  }
}

/**
 * Server-side role requirement helper for Server Actions
 * 
 * Use this in Server Actions to ensure the user has the required role.
 * Redirects to login if not authenticated, or throws error if role is insufficient.
 * 
 * @param requiredRole - The minimum role required to access the resource
 * @param redirectTo - Optional redirect path if authentication fails (default: '/login')
 * @returns User profile with role information
 * @throws Redirects to login page if not authenticated
 * @throws AuthenticationError if role is insufficient
 */
export async function requireRole(
  requiredRole: UserRoleType,
  redirectTo: string = '/login'
): Promise<{ id: string; email: string; role: UserRoleType }> {
  const user = await getAuthenticatedUserWithRole()

  if (!user) {
    redirect(redirectTo)
  }

  // Check role hierarchy
  if (ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY[requiredRole]) {
    throw new AuthenticationError(
      `Insufficient permissions. Required: ${requiredRole}, Current: ${user.role}`,
      403
    )
  }

  return user
}

/**
 * Server-side role requirement helper for API Routes
 * 
 * Use this in API route handlers (Route Handlers) to ensure the user has the required role.
 * Returns NextResponse with error status if authentication/authorization fails.
 * 
 * @param requiredRole - The minimum role required to access the resource
 * @returns User profile with role information
 * @throws Returns NextResponse with 401 if not authenticated
 * @throws Returns NextResponse with 403 if role is insufficient
 */
export async function requireRoleAPI(
  requiredRole: UserRoleType
): Promise<{ id: string; email: string; role: UserRoleType }> {
  const user = await getAuthenticatedUserWithRole()

  if (!user) {
    throw new AuthenticationError('Authentication required', 401)
  }

  // Check role hierarchy
  if (ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY[requiredRole]) {
    throw new AuthorizationError(
      `Insufficient permissions. Required: ${requiredRole}, Current: ${user.role}`,
      403
    )
  }

  return user
}

/**
 * Wrapper function to check if user is staff or higher
 * Use in Server Actions
 */
export async function isStaff(): Promise<{ id: string; email: string; role: UserRoleType }> {
  return requireRole(UserRole.STAFF)
}

/**
 * Wrapper function to check if user is verifier or higher
 * Use in Server Actions
 */
export async function isVerifier(): Promise<{ id: string; email: string; role: UserRoleType }> {
  return requireRole(UserRole.VERIFIER)
}

/**
 * Wrapper function to check if user is chief registrar or higher
 * Use in Server Actions
 */
export async function isChiefRegistrar(): Promise<{ id: string; email: string; role: UserRoleType }> {
  return requireRole(UserRole.CHIEF_REGISTRAR)
}

/**
 * Wrapper function to check if user is admin
 * Use in Server Actions
 */
export async function isAdmin(): Promise<{ id: string; email: string; role: UserRoleType }> {
  return requireRole(UserRole.ADMIN)
}

/**
 * Wrapper function to check if user is staff or higher (API Routes)
 * Use in API Route Handlers
 */
export async function isStaffAPI(): Promise<{ id: string; email: string; role: UserRoleType }> {
  return requireRoleAPI(UserRole.STAFF)
}

/**
 * Wrapper function to check if user is verifier or higher (API Routes)
 * Use in API Route Handlers
 */
export async function isVerifierAPI(): Promise<{ id: string; email: string; role: UserRoleType }> {
  return requireRoleAPI(UserRole.VERIFIER)
}

/**
 * Wrapper function to check if user is chief registrar or higher (API Routes)
 * Use in API Route Handlers
 */
export async function isChiefRegistrarAPI(): Promise<{ id: string; email: string; role: UserRoleType }> {
  return requireRoleAPI(UserRole.CHIEF_REGISTRAR)
}

/**
 * Wrapper function to check if user is admin (API Routes)
 * Use in API Route Handlers
 */
export async function isAdminAPI(): Promise<{ id: string; email: string; role: UserRoleType }> {
  return requireRoleAPI(UserRole.ADMIN)
}

/**
 * Get current user profile without role requirement
 * Returns null if not authenticated or profile doesn't exist
 */
export async function getCurrentUser(): Promise<{
  id: string
  email: string
  role: UserRoleType
} | null> {
  return getAuthenticatedUserWithRole()
}

/**
 * Error handler for API routes
 * Converts AuthenticationError and AuthorizationError to NextResponse
 */
export function handleAuthError(error: unknown): NextResponse {
  if (error instanceof AuthenticationError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    )
  }

  if (error instanceof AuthorizationError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    )
  }

  // Unknown error
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
