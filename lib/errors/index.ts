/**
 * Custom Error Classes and Error Handling
 * 
 * Centralized error handling system with custom error classes,
 * error serialization, and logging integration.
 */

// ============================================================================
// Base Error Class
// ============================================================================

/**
 * Base error class with additional properties for error handling
 */
export class AppError extends Error {
  public readonly errorCode: string
  public readonly statusCode: number
  public readonly context?: Record<string, unknown>
  public readonly timestamp: string
  public readonly isOperational: boolean

  constructor(
    message: string,
    errorCode: string,
    statusCode: number = 500,
    context?: Record<string, unknown>,
    isOperational: boolean = true
  ) {
    super(message)
    this.name = this.constructor.name
    this.errorCode = errorCode
    this.statusCode = statusCode
    this.context = context
    this.timestamp = new Date().toISOString()
    this.isOperational = isOperational

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }

    // Set prototype explicitly for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype)
  }

  /**
   * Serialize error for API responses
   */
  toJSON(): {
    error: {
      message: string
      code: string
      statusCode: number
      timestamp: string
      context?: Record<string, unknown>
    }
  } {
    return {
      error: {
        message: this.message,
        code: this.errorCode,
        statusCode: this.statusCode,
        timestamp: this.timestamp,
        ...(this.context && { context: this.context }),
      },
    }
  }

  /**
   * Serialize error for logging
   */
  toLog(): {
    name: string
    message: string
    code: string
    statusCode: number
    timestamp: string
    context?: Record<string, unknown>
    stack?: string
  } {
    return {
      name: this.name,
      message: this.message,
      code: this.errorCode,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      ...(this.context && { context: this.context }),
      ...(this.stack && { stack: this.stack }),
    }
  }
}

// ============================================================================
// Custom Error Classes
// ============================================================================

/**
 * Validation Error
 * Thrown when input validation fails (e.g., Zod validation errors)
 */
export class ValidationError extends AppError {
  public readonly validationErrors?: Array<{
    path: string | number
    message: string
  }>

  constructor(
    message: string = 'Validation failed',
    validationErrors?: Array<{ path: string | number; message: string }>,
    context?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', 400, context)
    this.validationErrors = validationErrors

    if (validationErrors && validationErrors.length > 0) {
      this.message = `${message}: ${validationErrors.map((e) => e.message).join(', ')}`
    }

    Object.setPrototypeOf(this, ValidationError.prototype)
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      error: {
        ...super.toJSON().error,
        validationErrors: this.validationErrors,
      },
    }
  }
}

/**
 * Authorization Error
 * Thrown when user lacks required permissions
 */
export class AuthorizationError extends AppError {
  constructor(
    message: string = 'Unauthorized access',
    context?: Record<string, unknown>
  ) {
    super(message, 'AUTHORIZATION_ERROR', 403, context)
    Object.setPrototypeOf(this, AuthorizationError.prototype)
  }
}

/**
 * Authentication Error
 * Thrown when user is not authenticated
 */
export class AuthenticationError extends AppError {
  constructor(
    message: string = 'Authentication required',
    context?: Record<string, unknown>
  ) {
    super(message, 'AUTHENTICATION_ERROR', 401, context)
    Object.setPrototypeOf(this, AuthenticationError.prototype)
  }
}

/**
 * Document Not Found Error
 * Thrown when a requested document does not exist
 */
export class DocumentNotFoundError extends AppError {
  constructor(
    documentId?: string,
    context?: Record<string, unknown>
  ) {
    const message = documentId
      ? `Document not found: ${documentId}`
      : 'Document not found'
    super(message, 'DOCUMENT_NOT_FOUND', 404, {
      documentId,
      ...context,
    })
    Object.setPrototypeOf(this, DocumentNotFoundError.prototype)
  }
}

/**
 * Property Not Found Error
 * Thrown when a requested property does not exist
 */
export class PropertyNotFoundError extends AppError {
  constructor(
    propertyId?: string,
    context?: Record<string, unknown>
  ) {
    const message = propertyId
      ? `Property not found: ${propertyId}`
      : 'Property not found'
    super(message, 'PROPERTY_NOT_FOUND', 404, {
      propertyId,
      ...context,
    })
    Object.setPrototypeOf(this, PropertyNotFoundError.prototype)
  }
}

/**
 * Upload Error
 * Thrown when file upload fails
 */
export class UploadError extends AppError {
  constructor(
    message: string = 'File upload failed',
    context?: Record<string, unknown>
  ) {
    super(message, 'UPLOAD_ERROR', 400, context)
    Object.setPrototypeOf(this, UploadError.prototype)
  }
}

/**
 * Database Error
 * Thrown when database operations fail
 */
export class DatabaseError extends AppError {
  public readonly originalError?: Error

  constructor(
    message: string = 'Database operation failed',
    originalError?: Error,
    context?: Record<string, unknown>
  ) {
    super(message, 'DATABASE_ERROR', 500, {
      ...context,
      ...(originalError && {
        originalError: {
          name: originalError.name,
          message: originalError.message,
        },
      }),
    })
    this.originalError = originalError
    Object.setPrototypeOf(this, DatabaseError.prototype)
  }

  override toLog() {
    return {
      ...super.toLog(),
      ...(this.originalError && {
        originalError: {
          name: this.originalError.name,
          message: this.originalError.message,
          stack: this.originalError.stack,
        },
      }),
    }
  }
}

/**
 * Not Found Error (Generic)
 * Thrown when a requested resource does not exist
 */
export class NotFoundError extends AppError {
  constructor(
    resource: string = 'Resource',
    resourceId?: string,
    context?: Record<string, unknown>
  ) {
    const message = resourceId
      ? `${resource} not found: ${resourceId}`
      : `${resource} not found`
    super(message, 'NOT_FOUND', 404, {
      resource,
      resourceId,
      ...context,
    })
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

/**
 * Conflict Error
 * Thrown when a resource conflict occurs (e.g., duplicate entry)
 */
export class ConflictError extends AppError {
  constructor(
    message: string = 'Resource conflict',
    context?: Record<string, unknown>
  ) {
    super(message, 'CONFLICT_ERROR', 409, context)
    Object.setPrototypeOf(this, ConflictError.prototype)
  }
}

/**
 * Rate Limit Error
 * Thrown when rate limit is exceeded
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter?: number,
    context?: Record<string, unknown>
  ) {
    super(message, 'RATE_LIMIT_ERROR', 429, {
      retryAfter,
      ...context,
    })
    Object.setPrototypeOf(this, RateLimitError.prototype)
  }
}

// ============================================================================
// Error Type Guards
// ============================================================================

/**
 * Check if error is an AppError instance
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Check if error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError
}

/**
 * Check if error is an AuthorizationError
 */
export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError
}

/**
 * Check if error is an AuthenticationError
 */
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError
}

/**
 * Check if error is a NotFoundError
 */
export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError
}

/**
 * Check if error is a DatabaseError
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof DatabaseError
}

// ============================================================================
// Error Serialization for API Responses
// ============================================================================

/**
 * Serialize error for API response
 * Returns appropriate error format based on error type
 */
export function serializeError(error: unknown): {
  error: {
    message: string
    code: string
    statusCode: number
    timestamp: string
    context?: Record<string, unknown>
    validationErrors?: Array<{ path: string | number; message: string }>
  }
} {
  if (isAppError(error)) {
    return error.toJSON()
  }

  // Handle Zod validation errors
  if (error && typeof error === 'object' && 'issues' in error) {
    const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> }
    const validationError = new ValidationError(
      'Validation failed',
      zodError.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))
    )
    return validationError.toJSON()
  }

  // Handle unknown errors
  const unknownError = new AppError(
    error instanceof Error ? error.message : 'An unexpected error occurred',
    'INTERNAL_ERROR',
    500,
    {
      originalError: error instanceof Error ? error.name : String(error),
    }
  )

  return unknownError.toJSON()
}

/**
 * Get HTTP status code from error
 */
export function getErrorStatusCode(error: unknown): number {
  if (isAppError(error)) {
    return error.statusCode
  }

  if (error && typeof error === 'object' && 'statusCode' in error) {
    return (error as { statusCode: number }).statusCode
  }

  return 500
}

// ============================================================================
// Error Logging
// ============================================================================

/**
 * Log level for error logging
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug'

/**
 * Error logger interface
 */
export interface ErrorLogger {
  error(message: string, error: unknown, context?: Record<string, unknown>): void
  warn(message: string, error: unknown, context?: Record<string, unknown>): void
  info(message: string, context?: Record<string, unknown>): void
  debug(message: string, context?: Record<string, unknown>): void
}

/**
 * Console-based error logger (default)
 */
class ConsoleErrorLogger implements ErrorLogger {
  error(message: string, error: unknown, context?: Record<string, unknown>): void {
    const logData = {
      level: 'error' as const,
      message,
      error: isAppError(error) ? error.toLog() : { message: String(error) },
      context,
      timestamp: new Date().toISOString(),
    }
    console.error(JSON.stringify(logData, null, 2))
  }

  warn(message: string, error: unknown, context?: Record<string, unknown>): void {
    const logData = {
      level: 'warn' as const,
      message,
      error: isAppError(error) ? error.toLog() : { message: String(error) },
      context,
      timestamp: new Date().toISOString(),
    }
    console.warn(JSON.stringify(logData, null, 2))
  }

  info(message: string, context?: Record<string, unknown>): void {
    const logData = {
      level: 'info' as const,
      message,
      context,
      timestamp: new Date().toISOString(),
    }
    console.info(JSON.stringify(logData, null, 2))
  }

  debug(message: string, context?: Record<string, unknown>): void {
    const logData = {
      level: 'debug' as const,
      message,
      context,
      timestamp: new Date().toISOString(),
    }
    console.debug(JSON.stringify(logData, null, 2))
  }
}

/**
 * Global error logger instance
 * Can be replaced with custom logger (e.g., Sentry, LogRocket)
 */
let errorLogger: ErrorLogger = new ConsoleErrorLogger()

/**
 * Set custom error logger
 */
export function setErrorLogger(logger: ErrorLogger): void {
  errorLogger = logger
}

/**
 * Get current error logger
 */
export function getErrorLogger(): ErrorLogger {
  return errorLogger
}

/**
 * Log error with appropriate level
 */
export function logError(
  error: unknown,
  level: LogLevel = 'error',
  context?: Record<string, unknown>
): void {
  const message = isAppError(error) ? error.message : String(error)

  switch (level) {
    case 'error':
      errorLogger.error(message, error, context)
      break
    case 'warn':
      errorLogger.warn(message, error, context)
      break
    case 'info':
      errorLogger.info(message, context)
      break
    case 'debug':
      errorLogger.debug(message, context)
      break
  }
}

// ============================================================================
// Error Handler for API Routes
// ============================================================================

/**
 * Error handler for Next.js API routes
 * Returns appropriate HTTP response based on error type
 */
export function handleApiError(error: unknown): Response {
  const serialized = serializeError(error)
  const statusCode = getErrorStatusCode(error)

  // Log error
  logError(error, 'error', {
    statusCode,
    ...serialized.error,
  })

  return new Response(JSON.stringify(serialized), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

// ============================================================================
// Error Handler for Server Actions
// ============================================================================

/**
 * Error result type for Server Actions
 */
export type ServerActionError = {
  error: {
    message: string
    code: string
    statusCode: number
    timestamp: string
    context?: Record<string, unknown>
    validationErrors?: Array<{ path: string | number; message: string }>
  }
}

/**
 * Error handler for Next.js Server Actions
 * Returns error object that can be returned from Server Actions
 */
export function handleServerActionError(error: unknown): ServerActionError {
  const serialized = serializeError(error)

  // Log error
  logError(error, 'error', {
    ...serialized.error,
  })

  return serialized
}
