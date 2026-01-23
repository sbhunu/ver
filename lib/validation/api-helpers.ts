/**
 * Validation API Helpers
 * 
 * Helper functions for API route validation, file upload validation,
 * and user permission validation with proper error handling.
 */

import { z, ZodSchema, ZodError } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { ValidationError, handleApiError } from '@/lib/errors'
import {
  fileUploadSchema,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from './schemas'
import {
  validateFile,
  sanitizeFilename,
  getFileMetadata,
  generateSha256HashFromFormDataFile,
  type FileMetadata,
} from '@/lib/utils/file'
import { generateSha256HashFromFileObject } from '@/lib/utils/hash'
import { getAuthenticatedUser } from '@/lib/auth/session'
import { UserRole, type UserRoleType } from '@/lib/auth/types'

// ============================================================================
// Request Validation
// ============================================================================

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  success: true
  data: T
}

export interface ValidationErrorResult {
  success: false
  error: ValidationError
  response: NextResponse
}

export type ValidationResponse<T> = ValidationResult<T> | ValidationErrorResult

/**
 * Validate request body against Zod schema
 * 
 * @param request - Next.js request object
 * @param schema - Zod schema to validate against
 * @returns Validation result with data or error response
 */
export async function validateRequest<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<ValidationResponse<T>> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      const validationError = new ValidationError(
        'Request validation failed',
        result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }))
      )

      return {
        success: false,
        error: validationError,
        response: handleApiError(validationError),
      }
    }

    return {
      success: true,
      data: result.data,
    }
  } catch (error) {
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      const validationError = new ValidationError('Invalid JSON in request body')
      return {
        success: false,
        error: validationError,
        response: handleApiError(validationError),
      }
    }

    // Handle other errors
    return {
      success: false,
      error: error instanceof ValidationError ? error : new ValidationError(String(error)),
      response: handleApiError(error),
    }
  }
}

/**
 * Validate query parameters against Zod schema
 * 
 * @param request - Next.js request object
 * @param schema - Zod schema to validate against
 * @returns Validation result with data or error response
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): ValidationResponse<T> {
  try {
    const searchParams = request.nextUrl.searchParams
    const params: Record<string, string> = {}

    // Convert URLSearchParams to object
    searchParams.forEach((value, key) => {
      params[key] = value
    })

    const result = schema.safeParse(params)

    if (!result.success) {
      const validationError = new ValidationError(
        'Query parameter validation failed',
        result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }))
      )

      return {
        success: false,
        error: validationError,
        response: handleApiError(validationError),
      }
    }

    return {
      success: true,
      data: result.data,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof ValidationError ? error : new ValidationError(String(error)),
      response: handleApiError(error),
    }
  }
}

/**
 * Parse and validate form data
 * 
 * @param request - Next.js request object
 * @param schema - Zod schema to validate form fields against
 * @returns Validation result with data or error response
 */
export async function validateFormData<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<ValidationResponse<T>> {
  try {
    const formData = await request.formData()
    const data: Record<string, unknown> = {}

    // Convert FormData to object
    formData.forEach((value, key) => {
      // Handle multiple values for the same key
      if (data[key]) {
        if (Array.isArray(data[key])) {
          (data[key] as unknown[]).push(value)
        } else {
          data[key] = [data[key], value]
        }
      } else {
        data[key] = value
      }
    })

    const result = schema.safeParse(data)

    if (!result.success) {
      const validationError = new ValidationError(
        'Form data validation failed',
        result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }))
      )

      return {
        success: false,
        error: validationError,
        response: handleApiError(validationError),
      }
    }

    return {
      success: true,
      data: result.data,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof ValidationError ? error : new ValidationError(String(error)),
      response: handleApiError(error),
    }
  }
}

// ============================================================================
// File Upload Validation
// ============================================================================

/**
 * File upload validation result
 */
export interface FileUploadResult {
  success: true
  file: File
  metadata: FileMetadata
  sanitizedFilename: string
}

export interface FileUploadErrorResult {
  success: false
  error: ValidationError
  response: NextResponse
}

export type FileUploadValidationResponse = FileUploadResult | FileUploadErrorResult

/**
 * Validate file upload from FormData
 * 
 * @param formData - FormData object
 * @param fieldName - Name of the file field in FormData
 * @returns Validation result with file and metadata or error response
 */
export async function validateFileUpload(
  formData: FormData,
  fieldName: string = 'file'
): Promise<FileUploadValidationResponse> {
  try {
    const file = formData.get(fieldName)

    if (!file || !(file instanceof File)) {
      const error = new ValidationError(`File field '${fieldName}' is required or invalid`)
      return {
        success: false,
        error,
        response: handleApiError(error),
      }
    }

    // Validate file using fileUploadSchema
    const fileData = {
      name: file.name,
      size: file.size,
      type: file.type,
    }

    const validationResult = fileUploadSchema.safeParse(fileData)

    if (!validationResult.success) {
      const validationError = new ValidationError(
        'File upload validation failed',
        validationResult.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }))
      )

      return {
        success: false,
        error: validationError,
        response: handleApiError(validationError),
      }
    }

    // Additional validation using file utilities
    const fileValidation = validateFile(file.name, file.size, file.type)

    if (!fileValidation.valid) {
      const validationError = new ValidationError(
        'File validation failed',
        fileValidation.errors.map((error) => ({
          path: 'file',
          message: error,
        }))
      )

      return {
        success: false,
        error: validationError,
        response: handleApiError(validationError),
      }
    }

    // Get file metadata
    const metadata = await getFileMetadata(file)
    const sanitized = sanitizeFilename(file.name)

    return {
      success: true,
      file,
      metadata,
      sanitizedFilename: sanitized,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof ValidationError ? error : new ValidationError(String(error)),
      response: handleApiError(error),
    }
  }
}

/**
 * Validate and process file upload with hash generation
 * 
 * @param formData - FormData object
 * @param fieldName - Name of the file field in FormData
 * @returns Validation result with file, metadata, and hash or error response
 */
export interface FileUploadWithHashResult extends FileUploadResult {
  hash: string
}

export interface FileUploadWithHashErrorResult extends FileUploadErrorResult {}

export type FileUploadWithHashResponse = FileUploadWithHashResult | FileUploadWithHashErrorResult

export async function validateFileUploadWithHash(
  formData: FormData,
  fieldName: string = 'file'
): Promise<FileUploadWithHashResponse> {
  const fileResult = await validateFileUpload(formData, fieldName)

  if (!fileResult.success) {
    return {
      success: false,
      error: fileResult.error,
      response: fileResult.response,
    }
  }

  try {
    // Generate SHA-256 hash
    const hash = await generateSha256HashFromFormDataFile(fileResult.file)

    return {
      success: true,
      file: fileResult.file,
      metadata: fileResult.metadata,
      sanitizedFilename: fileResult.sanitizedFilename,
      hash,
    }
  } catch (error) {
    const validationError = new ValidationError(
      'Failed to generate file hash',
      [],
      { originalError: String(error) }
    )

    return {
      success: false,
      error: validationError,
      response: handleApiError(validationError),
    }
  }
}

// ============================================================================
// User Permission Validation
// ============================================================================

/**
 * User permission validation result
 */
export interface PermissionValidationResult {
  success: true
  user: {
    id: string
    email: string
    role: UserRoleType
  }
}

export interface PermissionValidationErrorResult {
  success: false
  error: ValidationError
  response: NextResponse
}

export type PermissionValidationResponse = PermissionValidationResult | PermissionValidationErrorResult

/**
 * Validate user permissions for API routes
 * 
 * @param request - Next.js request object
 * @param requiredRole - Minimum required role
 * @returns Validation result with user data or error response
 */
export async function validateUserPermissions(
  request: NextRequest,
  requiredRole: UserRole
): Promise<PermissionValidationResponse> {
  try {
    const user = await getAuthenticatedUser()

    if (!user) {
      const error = new ValidationError('Authentication required', [], { statusCode: 401 })
      return {
        success: false,
        error,
        response: NextResponse.json(
          { error: { message: 'Authentication required', code: 'AUTHENTICATION_ERROR', statusCode: 401 } },
          { status: 401 }
        ),
      }
    }

    // Check role hierarchy
    const userRoleIndex = Object.values(UserRole).indexOf(user.role as UserRole)
    const requiredRoleIndex = Object.values(UserRole).indexOf(requiredRole)

    if (userRoleIndex < requiredRoleIndex) {
      const error = new ValidationError(
        `Insufficient permissions. Required role: ${requiredRole}`,
        [],
        { statusCode: 403, userRole: user.role, requiredRole }
      )
      return {
        success: false,
        error,
        response: NextResponse.json(
          {
            error: {
              message: 'Insufficient permissions',
              code: 'AUTHORIZATION_ERROR',
              statusCode: 403,
            },
          },
          { status: 403 }
        ),
      }
    }

    return {
      success: true,
      user: {
        id: user.profile.id,
        email: user.profile.email,
        role: user.profile.role,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof ValidationError ? error : new ValidationError(String(error)),
      response: handleApiError(error),
    }
  }
}

/**
 * Validate user permissions with role check
 * 
 * @param request - Next.js request object
 * @param checkRole - Function to check if user role meets requirement
 * @returns Validation result with user data or error response
 */
export async function validateUserPermissionsWithCheck(
  request: NextRequest,
  checkRole: (userRole: UserRoleType) => boolean
): Promise<PermissionValidationResponse> {
  try {
    const user = await getAuthenticatedUser()

    if (!user) {
      const error = new ValidationError('Authentication required', [], { statusCode: 401 })
      return {
        success: false,
        error,
        response: NextResponse.json(
          { error: { message: 'Authentication required', code: 'AUTHENTICATION_ERROR', statusCode: 401 } },
          { status: 401 }
        ),
      }
    }

    if (!checkRole(user.role)) {
      const error = new ValidationError(
        'Insufficient permissions',
        [],
        { statusCode: 403, userRole: user.role }
      )
      return {
        success: false,
        error,
        response: NextResponse.json(
          {
            error: {
              message: 'Insufficient permissions',
              code: 'AUTHORIZATION_ERROR',
              statusCode: 403,
            },
          },
          { status: 403 }
        ),
      }
    }

    return {
      success: true,
      user: {
        id: user.profile.id,
        email: user.profile.email,
        role: user.profile.role,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof ValidationError ? error : new ValidationError(String(error)),
      response: handleApiError(error),
    }
  }
}

// ============================================================================
// Combined Validation Helpers
// ============================================================================

/**
 * Validate request with body and permissions
 */
export async function validateRequestWithPermissions<T>(
  request: NextRequest,
  bodySchema: ZodSchema<T>,
  requiredRole: UserRole
): Promise<
  | { success: true; data: T; user: { id: string; email: string; role: UserRoleType } }
  | { success: false; error: ValidationError; response: NextResponse }
> {
  // First validate permissions
  const permissionResult = await validateUserPermissions(request, requiredRole)
  if (!permissionResult.success) {
    return permissionResult
  }

  // Then validate request body
  const bodyResult = await validateRequest(request, bodySchema)
  if (!bodyResult.success) {
    return bodyResult
  }

  return {
    success: true,
    data: bodyResult.data,
    user: permissionResult.user,
  }
}

/**
 * Validate file upload with permissions
 */
export async function validateFileUploadWithPermissions(
  formData: FormData,
  requiredRole: UserRole,
  fieldName: string = 'file'
): Promise<
  | {
      success: true
      file: File
      metadata: FileMetadata
      sanitizedFilename: string
      user: { id: string; email: string; role: UserRoleType }
    }
  | { success: false; error: ValidationError; response: NextResponse }
> {
  // Note: This requires the request object for permission check
  // In practice, you'd pass the request separately or handle permissions in middleware
  throw new Error(
    'validateFileUploadWithPermissions requires request object. Use validateFileUpload and validateUserPermissions separately.'
  )
}
