'use client'

/**
 * Status Badge Component
 * 
 * Shared component for displaying status badges with consistent styling
 */

export type StatusType =
  | 'pending'
  | 'hashed'
  | 'verified'
  | 'rejected'
  | 'flagged'
  | 'active'
  | 'inactive'
  | 'archived'
  | 'success'
  | 'error'
  | 'warning'
  | 'info'

export interface StatusBadgeProps {
  status: StatusType | string
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function StatusBadge({ status, label, size = 'md' }: StatusBadgeProps) {
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'hashed':
        return 'bg-blue-100 text-blue-800'
      case 'verified':
      case 'success':
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'rejected':
      case 'error':
        return 'bg-red-100 text-red-800'
      case 'flagged':
      case 'warning':
        return 'bg-orange-100 text-orange-800'
      case 'inactive':
      case 'archived':
        return 'bg-gray-100 text-gray-800'
      case 'info':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getSizeClasses = (size: 'sm' | 'md' | 'lg'): string => {
    switch (size) {
      case 'sm':
        return 'px-2 py-0.5 text-xs'
      case 'md':
        return 'px-2.5 py-0.5 text-xs'
      case 'lg':
        return 'px-3 py-1 text-sm'
      default:
        return 'px-2.5 py-0.5 text-xs'
    }
  }

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${getStatusColor(status)} ${getSizeClasses(size)}`}
    >
      {label || status}
    </span>
  )
}
