import { requireRoleAPI, handleAuthError, type AuthenticationError, type AuthorizationError } from './require-role'
import type { UserRoleType } from './types'
import { NextResponse } from 'next/server'

/**
 * API route wrapper that handles authentication and role requirements
 * 
 * Usage:
 * ```typescript
 * export async function GET(request: Request) {
 *   return withAuth(request, UserRole.ADMIN, async (user) => {
 *     // Your API logic here
 *     return NextResponse.json({ data: '...' })
 *   })
 * }
 * ```
 */
export async function withAuth(
  request: Request,
  requiredRole: UserRoleType,
  handler: (user: { id: string; email: string; role: UserRoleType }) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const user = await requireRoleAPI(requiredRole)
    return await handler(user)
  } catch (error) {
    return handleAuthError(error)
  }
}

/**
 * API route wrapper for any authenticated user (no role requirement)
 * 
 * Usage:
 * ```typescript
 * export async function GET(request: Request) {
 *   return withAuthAny(request, async (user) => {
 *     // Your API logic here
 *     return NextResponse.json({ data: '...' })
 *   })
 * }
 * ```
 */
export async function withAuthAny(
  request: Request,
  handler: (user: { id: string; email: string; role: UserRoleType }) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const { getCurrentUser } = await import('./require-role')
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return await handler(user)
  } catch (error) {
    return handleAuthError(error)
  }
}

/**
 * Type guard for authentication errors
 */
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof Error && error.name === 'AuthenticationError'
}

/**
 * Type guard for authorization errors
 */
export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof Error && error.name === 'AuthorizationError'
}
