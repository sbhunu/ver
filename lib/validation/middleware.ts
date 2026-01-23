/**
 * Validation Middleware for Next.js
 * 
 * Middleware integration for request validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { ZodSchema } from 'zod'
import { validateRequest, validateQueryParams, validateFormData } from './api-helpers'
import { ValidationError, handleApiError } from '@/lib/errors'

/**
 * Middleware options for validation
 */
export interface ValidationMiddlewareOptions {
  validateBody?: ZodSchema<unknown>
  validateQuery?: ZodSchema<unknown>
  validateForm?: boolean
  requireAuth?: boolean
}

/**
 * Create validation middleware for Next.js API routes
 * 
 * @param options - Validation options
 * @returns Middleware function
 */
export function createValidationMiddleware(options: ValidationMiddlewareOptions) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    try {
      // Validate query parameters if schema provided
      if (options.validateQuery) {
        const queryResult = validateQueryParams(request, options.validateQuery)
        if (!queryResult.success) {
          return queryResult.response
        }
      }

      // Validate request body if schema provided
      if (options.validateBody) {
        const bodyResult = await validateRequest(request, options.validateBody)
        if (!bodyResult.success) {
          return bodyResult.response
        }
      }

      // Validate form data if requested
      if (options.validateForm) {
        // Note: Form data validation requires a schema
        // This is a placeholder - in practice, you'd pass a schema
        const contentType = request.headers.get('content-type') || ''
        if (contentType.includes('multipart/form-data')) {
          // Form data validation would go here
          // For now, just check if it's form data
        }
      }

      // If all validations pass, return null to continue
      return null
    } catch (error) {
      return handleApiError(error)
    }
  }
}

/**
 * Validate request in API route handler
 * 
 * @param request - Next.js request
 * @param bodySchema - Schema for request body
 * @param querySchema - Schema for query parameters
 * @returns Validation result or error response
 */
export async function validateApiRequest<TBody = unknown, TQuery = unknown>(
  request: NextRequest,
  bodySchema?: ZodSchema<TBody>,
  querySchema?: ZodSchema<TQuery>
): Promise<
  | {
      success: true
      body?: TBody
      query?: TQuery
    }
  | {
      success: false
      response: NextResponse
    }
> {
  try {
    let body: TBody | undefined
    let query: TQuery | undefined

    // Validate query parameters
    if (querySchema) {
      const queryResult = validateQueryParams(request, querySchema)
      if (!queryResult.success) {
        return { success: false, response: queryResult.response }
      }
      query = queryResult.data
    }

    // Validate request body
    if (bodySchema) {
      const bodyResult = await validateRequest(request, bodySchema)
      if (!bodyResult.success) {
        return { success: false, response: bodyResult.response }
      }
      body = bodyResult.data
    }

    return {
      success: true,
      body,
      query,
    }
  } catch (error) {
    return {
      success: false,
      response: handleApiError(error),
    }
  }
}
