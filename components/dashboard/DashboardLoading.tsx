'use client'

/**
 * Dashboard Loading Component
 * 
 * Shared loading component for dashboard pages
 */

export interface DashboardLoadingProps {
  message?: string
  fullScreen?: boolean
}

export default function DashboardLoading({ message = 'Loading...', fullScreen = false }: DashboardLoadingProps) {
  const containerClasses = fullScreen
    ? 'fixed inset-0 flex items-center justify-center bg-gray-50'
    : 'flex items-center justify-center p-8'

  return (
    <div className={containerClasses}>
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  )
}
