/**
 * Authentication and Authorization Types
 * 
 * Defines TypeScript interfaces for user roles and authentication utilities
 */

/**
 * User roles in the system
 * Must match the user_role enum in the database
 */
export enum UserRole {
  STAFF = 'staff',
  VERIFIER = 'verifier',
  CHIEF_REGISTRAR = 'chief_registrar',
  ADMIN = 'admin',
}

/**
 * User role type (for type annotations)
 */
export type UserRoleType = 'staff' | 'verifier' | 'chief_registrar' | 'admin'

/**
 * Supabase Auth User with extended properties
 */
export interface User {
  id: string
  email?: string
  phone?: string
  confirmed_at?: string
  last_sign_in_at?: string
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
  aud?: string
  created_at?: string
}

/**
 * Extended user profile with role information from ver_profiles table
 */
export interface UserProfile {
  id: string
  email: string
  role: UserRoleType
  created_at: string
  updated_at: string
}

/**
 * Complete user information combining auth user and profile
 */
export interface AuthenticatedUser extends User {
  profile: UserProfile
}

/**
 * Authentication session with user and profile
 */
export interface Session {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at?: number
  token_type: string
  user: User
}

/**
 * Authentication state for client-side use
 */
export interface AuthState {
  user: AuthenticatedUser | null
  session: Session | null
  loading: boolean
  error: AuthError | null
}

/**
 * Authentication error with type and message
 */
export interface AuthError {
  message: string
  status?: number
  type?: 'auth' | 'network' | 'permission' | 'validation' | 'unknown'
}

/**
 * Authentication session with user and profile (legacy interface for compatibility)
 */
export interface AuthSession {
  user: User
  profile: UserProfile | null
}

/**
 * Role hierarchy for permission checks
 * Higher number = more permissions
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  staff: 1,
  verifier: 2,
  chief_registrar: 3,
  admin: 4,
} as const

/**
 * Check if a role has at least the required permission level
 */
export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

/**
 * Check if a role matches exactly
 */
export function hasExactRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return userRole === requiredRole
}

/**
 * Check if a role is one of the allowed roles
 */
export function hasAnyRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole)
}
