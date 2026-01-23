/**
 * Authentication and Authorization Module
 * 
 * Central export point for all auth-related utilities
 */

export * from './types'
export * from './require-role'
export * from './session'
export * from './auth-helpers'
export * from './api-helpers'

// Re-export commonly used types and enums
export { UserRole } from './types'
export type {
  UserRoleType,
  User,
  UserProfile,
  AuthenticatedUser,
  Session,
  AuthState,
  AuthError,
  AuthSession,
} from './types'

// Re-export error types
export type { AuthenticationError, AuthorizationError } from './require-role'