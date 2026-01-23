/**
 * Error Display Component
 * 
 * Displays error messages in a user-friendly format
 */

'use client'

import React from 'react'
import { isAppError, isValidationError, serializeError } from '@/lib/errors'

interface ErrorDisplayProps {
  error: unknown
  title?: string
  className?: string
}

/**
 * Error Display Component
 * Renders error messages in a user-friendly format
 */
export function ErrorDisplay({ error, title, className = '' }: ErrorDisplayProps) {
  const serialized = serializeError(error)
  const isAppErr = isAppError(error)
  const isValidationErr = isValidationError(error)

  return (
    <div className={`rounded-lg border border-red-200 bg-red-50 p-4 ${className}`}>
      {title && (
        <h3 className="mb-2 text-lg font-semibold text-red-800">{title}</h3>
      )}

      <div className="text-red-700">
        <p className="mb-2">{serialized.error.message}</p>

        {isAppErr && (
          <p className="text-sm text-red-600">
            Error Code: <span className="font-mono">{serialized.error.code}</span>
          </p>
        )}

        {isValidationErr && error.validationErrors && error.validationErrors.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-sm font-semibold">Validation Errors:</p>
            <ul className="list-inside list-disc space-y-1 text-sm">
              {error.validationErrors.map((err, index) => (
                <li key={index}>
                  <span className="font-mono text-xs">{err.path}:</span> {err.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {serialized.error.context && Object.keys(serialized.error.context).length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-red-600 hover:text-red-800">
              Additional Details
            </summary>
            <pre className="mt-2 overflow-auto rounded bg-red-100 p-2 text-xs">
              {JSON.stringify(serialized.error.context, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

/**
 * Inline Error Display
 * Compact error display for forms and inline contexts
 */
interface InlineErrorDisplayProps {
  error: unknown
  className?: string
}

export function InlineErrorDisplay({ error, className = '' }: InlineErrorDisplayProps) {
  const serialized = serializeError(error)

  return (
    <p className={`text-sm text-red-600 ${className}`}>{serialized.error.message}</p>
  )
}
