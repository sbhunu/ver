/**
 * Document Upload Page
 *
 * Page for uploading property deed documents with progress tracking.
 * Task Reference: 4.2, 4.3
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { uploadDocument } from '@/app/actions/upload-document'
import { useUploadProgress } from '@/lib/hooks/useUploadProgress'
import { createClient } from '@/lib/supabase/client'
import { UploadProgress } from '@/components/upload'
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from '@/lib/validation/schemas'

interface Property {
  id: string
  property_no: string
  owner_name: string | null
}

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx']
const MAX_SIZE_MB = MAX_FILE_SIZE / (1024 * 1024)

function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File size must not exceed ${MAX_SIZE_MB}MB. Current: ${(file.size / 1024 / 1024).toFixed(2)}MB`
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return `Invalid file type. Allowed: PDF, DOC, DOCX`
  }
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '')
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
  }
  return null
}

const ROLE_DASHBOARDS: Record<string, string> = {
  staff: '/dashboard/staff',
  verifier: '/dashboard/verifier',
  chief_registrar: '/dashboard/chief-registrar',
  admin: '/dashboard/admin',
}

export default function UploadPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [dashboardHref, setDashboardHref] = useState('/dashboard/staff')
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [docNumber, setDocNumber] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const { progress, reset } = useUploadProgress()

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('ver_profiles')
            .select('role')
            .eq('id', user.id)
            .single()
          const role = profile?.role as string | undefined
          if (role && role in ROLE_DASHBOARDS) {
            setDashboardHref(ROLE_DASHBOARDS[role])
          }
        }
      } catch {
        /* ignore */
      }
      try {
        const { data, error: fetchError } = await supabase
          .from('ver_properties')
          .select('id, property_no, owner_name')
          .order('property_no', { ascending: true })
          .limit(100)
        if (!fetchError) setProperties(data || [])
      } catch {
        /* ignore */
      }
    }
    load()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    const input = e.target
    if (!selectedFile) {
      setFile(null)
      setError(null)
      return
    }
    const validationError = validateFile(selectedFile)
    if (validationError) {
      setError(validationError)
      setFile(null)
      setSuccess(false)
      if (input) input.value = ''
      return
    }
    setFile(selectedFile)
    setError(null)
    setSuccess(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!file) {
      setError('Please select a file')
      return
    }
    const fileError = validateFile(file)
    if (fileError) {
      setError(fileError)
      return
    }
    if (!selectedPropertyId) {
      setError('Please select a property')
      return
    }
    if (!docNumber.trim()) {
      setError('Please enter a document number')
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('property_id', selectedPropertyId)
      formData.append('doc_number', docNumber.trim())

      const result = await uploadDocument(formData)

      if (result.success) {
        setSuccess(true)
        setFile(null)
        setDocNumber('')
        setSelectedPropertyId('')
        reset()

        const fileInput = document.getElementById('file-input') as HTMLInputElement
        if (fileInput) fileInput.value = ''

        setTimeout(() => router.push('/documents'), 2000)
      } else {
        setError(result.error || 'Upload failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const showProgress = progress.state !== 'idle' || isSubmitting

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <Link
            href={dashboardHref}
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            ← Back to Dashboard
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Document</h1>
            <p className="text-gray-600">
              Upload a property deed document (PDF, DOC, DOCX) for verification
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Property Selection */}
            <div>
              <label htmlFor="property" className="block text-sm font-medium text-gray-700 mb-2">
                Property <span className="text-red-500">*</span>
              </label>
              <select
                id="property"
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={isSubmitting}
              >
                <option value="">Select a property...</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.property_no} {property.owner_name ? `– ${property.owner_name}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Document Number */}
            <div>
              <label htmlFor="docNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Document Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="docNumber"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter document number"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* File Upload */}
            <div>
              <label htmlFor="file-input" className="block text-sm font-medium text-gray-700 mb-2">
                Document File <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-input"
                      className={`relative rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 ${isSubmitting ? 'cursor-not-allowed opacity-60' : 'cursor-pointer bg-white'}`}
                    >
                      <span>Upload a file</span>
                      <input
                        id="file-input"
                        name="file"
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="sr-only"
                        onChange={handleFileChange}
                        required
                        disabled={isSubmitting}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PDF, DOC, DOCX up to {MAX_SIZE_MB}MB</p>
                  {file && (
                    <p className="text-sm text-gray-900 mt-2">
                      Selected: <span className="font-medium">{file.name}</span> (
                      {(file.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Upload Progress */}
            {showProgress && (
              <div className="mt-4">
                {progress.state !== 'idle' ? (
                  <UploadProgress progress={progress} />
                ) : (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
                        aria-hidden
                      />
                      <span className="text-sm font-medium text-blue-800">Uploading…</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Document uploaded successfully! Redirecting to documents list...
                    </h3>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Link
                href="/documents"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={progress.state === 'uploading' || success || isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {progress.state === 'uploading' || isSubmitting ? 'Uploading…' : 'Upload Document'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
