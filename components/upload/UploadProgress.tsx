/**
 * Upload Progress Component
 * 
 * Displays upload progress with visual feedback
 */

'use client'

import React from 'react'
import type { UploadProgress } from '@/lib/utils/multipart-upload'

interface UploadProgressProps {
  progress: UploadProgress
  className?: string
}

export function UploadProgress({ progress, className = '' }: UploadProgressProps) {
  if (progress.state === 'idle') {
    return null
  }

  return (
    <div className={`rounded-lg border bg-white p-4 shadow ${className}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          {progress.state === 'uploading' && 'Uploading...'}
          {progress.state === 'success' && 'Upload Complete'}
          {progress.state === 'error' && 'Upload Failed'}
          {progress.state === 'cancelled' && 'Upload Cancelled'}
        </span>
        <span className="text-sm text-gray-500">
          {progress.progress}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full transition-all duration-300 ${
            progress.state === 'success'
              ? 'bg-green-500'
              : progress.state === 'error' || progress.state === 'cancelled'
              ? 'bg-red-500'
              : 'bg-blue-500'
          }`}
          style={{ width: `${progress.progress}%` }}
        />
      </div>

      {/* Progress details */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {formatBytes(progress.bytesUploaded)} / {formatBytes(progress.totalBytes)}
        </span>
        {progress.totalChunks > 1 && (
          <span>
            Chunk {progress.currentChunk} of {progress.totalChunks}
          </span>
        )}
      </div>

      {/* Error message */}
      {progress.state === 'error' && progress.error && (
        <div className="mt-2 rounded bg-red-50 p-2 text-sm text-red-700">
          {progress.error}
        </div>
      )}
    </div>
  )
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
