'use client'

/**
 * Progress Indicator Component
 * 
 * Shared component for displaying progress indicators
 */

export interface ProgressIndicatorProps {
  value: number
  max?: number
  label?: string
  showPercentage?: boolean
  size?: 'sm' | 'md' | 'lg'
  color?: 'blue' | 'green' | 'yellow' | 'red'
}

export default function ProgressIndicator({
  value,
  max = 100,
  label,
  showPercentage = true,
  size = 'md',
  color = 'blue',
}: ProgressIndicatorProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  const getSizeClasses = (size: 'sm' | 'md' | 'lg'): string => {
    switch (size) {
      case 'sm':
        return 'h-1'
      case 'md':
        return 'h-2'
      case 'lg':
        return 'h-3'
      default:
        return 'h-2'
    }
  }

  const getColorClasses = (color: 'blue' | 'green' | 'yellow' | 'red'): string => {
    switch (color) {
      case 'blue':
        return 'bg-blue-600'
      case 'green':
        return 'bg-green-600'
      case 'yellow':
        return 'bg-yellow-600'
      case 'red':
        return 'bg-red-600'
      default:
        return 'bg-blue-600'
    }
  }

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {showPercentage && (
            <span className="text-sm text-gray-600">{percentage.toFixed(0)}%</span>
          )}
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${getSizeClasses(size)}`}>
        <div
          className={`${getColorClasses(color)} transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
