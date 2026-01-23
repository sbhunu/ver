'use client'

/**
 * Dashboard Error Boundary Component
 * 
 * Error boundary specifically for dashboard pages
 */

import React from 'react'
import ErrorBoundary from '@/components/errors/ErrorBoundary'
import ErrorDisplay from '@/components/errors/ErrorDisplay'

export interface DashboardErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
}

export default function DashboardErrorBoundary({
  children,
  fallback: Fallback,
}: DashboardErrorBoundaryProps) {
  const defaultFallback = ({ error, resetError }: { error: Error; resetError: () => void }) => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Dashboard Error</h2>
        <ErrorDisplay error={error} />
        <button
          onClick={resetError}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    </div>
  )

  return (
    <ErrorBoundary fallback={Fallback || defaultFallback}>{children}</ErrorBoundary>
  )
}
