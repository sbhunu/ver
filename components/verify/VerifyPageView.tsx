'use client'

/**
 * Verify Page View
 *
 * Property-centric verification flow:
 * 1. Search property by address, Deed #, or select from list
 * 2. Check deed/hash status (no deed | no hash | ready)
 * 3. Upload document for verification
 * 4. Compare hashes and inform user (verified | not verified)
 * Task Reference: 7.2, 7.3
 */

import { useState, useCallback } from 'react'
import VerTopNav from '@/components/layout/VerTopNav'

type PropertyStatusResponse = {
  status: 'no_deed' | 'no_hash' | 'ready'
  property?: {
    id: string
    property_no: string
    address: string | null
    owner_name: string | null
  }
  document?: {
    id: string
    doc_number: string
    original_filename: string | null
  }
}

type SearchResultItem = {
  id: string
  property_no: string
  address: string | null
  owner_name: string | null
}

type VerifyWithFileResult = {
  success: true
  data: {
    message: string
    documentId: string
    verification: {
      id: string
      status: 'verified' | 'rejected'
      reason: string | null
      hashMatch: boolean
      computedHash: string
      storedHash: string
      discrepancyMetadata: Record<string, unknown>
    }
    fileInfo: { fileName?: string; computationDurationMs: number }
  }
}

export interface VerifyPageViewProps {
  documents?: Array<{ id: string; doc_number: string; original_filename: string | null }>
  user: { id: string; email: string; role: string }
}

type SearchMode = 'search' | 'list'

export default function VerifyPageView({ user }: VerifyPageViewProps) {
  const [searchMode, setSearchMode] = useState<SearchMode>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([])
  const [searching, setSearching] = useState(false)
  const [listProperties, setListProperties] = useState<SearchResultItem[]>([])
  const [listPage, setListPage] = useState(1)
  const [listTotal, setListTotal] = useState(0)
  const [loadingList, setLoadingList] = useState(false)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [statusData, setStatusData] = useState<PropertyStatusResponse | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileResult, setFileResult] = useState<VerifyWithFileResult['data'] | null>(null)

  const resetVerification = useCallback(() => {
    setFile(null)
    setFileResult(null)
    setError(null)
  }, [])

  const loadPropertyStatus = useCallback(async (propertyId: string) => {
    setLoadingStatus(true)
    setError(null)
    setStatusData(null)
    setFileResult(null)
    try {
      const res = await fetch(`/api/verify/property-status?propertyId=${encodeURIComponent(propertyId)}`)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error ?? 'Failed to load property status')
      }
      setStatusData(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load property status')
    } finally {
      setLoadingStatus(false)
    }
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearching(true)
    setError(null)
    setSearchResults([])
    try {
      const res = await fetch(`/api/verify/search?q=${encodeURIComponent(searchQuery.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Search failed')
      setSearchResults(data.results ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  const loadPropertyList = useCallback(async (page: number = 1) => {
    setLoadingList(true)
    setError(null)
    try {
      const res = await fetch(`/api/properties?page=${page}&page_size=30`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Failed to load properties')
      setListProperties(data.properties ?? [])
      setListTotal(data.total ?? 0)
      setListPage(page)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load properties')
    } finally {
      setLoadingList(false)
    }
  }, [])

  const handleSelectProperty = (propertyId: string) => {
    setSelectedPropertyId(propertyId)
    loadPropertyStatus(propertyId)
  }

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!statusData?.document?.id || !file) {
      setError('Please select a property with a ready deed and choose a file.')
      return
    }
    setSubmitting(true)
    setError(null)
    setFileResult(null)
    try {
      const form = new FormData()
      form.set('file', file)
      form.set('documentId', statusData.document.id)
      const res = await fetch('/api/verifications/verify-with-file', {
        method: 'POST',
        body: form,
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error ?? 'Verification failed')
      }
      if (json?.success && json?.data) {
        setFileResult(json.data)
      } else {
        throw new Error('Invalid response')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed')
    } finally {
      setSubmitting(false)
    }
  }

  const startOver = () => {
    setSelectedPropertyId('')
    setStatusData(null)
    setSearchQuery('')
    setSearchResults([])
    setListProperties([])
    resetVerification()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <VerTopNav />
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Verify Deed Document</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Search for a property, then upload the document to be verified against the stored deed hash
            </p>
          </div>

          <div className="p-6 space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
            )}

            {/* Step 1: Find property */}
            {!selectedPropertyId ? (
              <>
                <div className="flex gap-2 border-b border-gray-200 pb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchMode('search')
                      setError(null)
                      setSearchResults([])
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-t-md ${
                      searchMode === 'search'
                        ? 'bg-gray-100 text-gray-900 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Search by address or Deed #
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchMode('list')
                      setError(null)
                      loadPropertyList(1)
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-t-md ${
                      searchMode === 'list'
                        ? 'bg-gray-100 text-gray-900 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Select from property list
                  </button>
                </div>

                {searchMode === 'search' && (
                  <form onSubmit={handleSearch} className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Search by address, Property #, or Deed #
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="e.g. 123 Main St, DEED-001, or property number"
                          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                        <button
                          type="submit"
                          disabled={searching || !searchQuery.trim()}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          {searching ? 'Searching…' : 'Search'}
                        </button>
                      </div>
                    </div>
                    {searchResults.length > 0 && (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <ul className="divide-y divide-gray-200 max-h-60 overflow-y-auto">
                          {searchResults.map((p) => (
                            <li key={p.id}>
                              <button
                                type="button"
                                onClick={() => handleSelectProperty(p.id)}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm"
                              >
                                <span className="font-medium text-gray-900">{p.property_no}</span>
                                {p.address && (
                                  <span className="text-gray-600 ml-2">— {p.address}</span>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </form>
                )}

                {searchMode === 'list' && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Select a property from the list below
                    </p>
                    {loadingList ? (
                      <div className="py-8 text-center text-gray-500">Loading properties…</div>
                    ) : listProperties.length > 0 ? (
                      <>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <ul className="divide-y divide-gray-200 max-h-72 overflow-y-auto">
                            {listProperties.map((p) => (
                              <li key={p.id}>
                                <button
                                  type="button"
                                  onClick={() => handleSelectProperty(p.id)}
                                  className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm"
                                >
                                  <span className="font-medium text-gray-900">{p.property_no}</span>
                                  {p.address && (
                                    <span className="text-gray-600 ml-2">— {p.address}</span>
                                  )}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                        {listTotal > 30 && (
                          <div className="flex gap-2 justify-center">
                            <button
                              type="button"
                              onClick={() => loadPropertyList(listPage - 1)}
                              disabled={listPage <= 1}
                              className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
                            >
                              Previous
                            </button>
                            <span className="py-1 text-sm text-gray-600">
                              Page {listPage} of {Math.ceil(listTotal / 30)}
                            </span>
                            <button
                              type="button"
                              onClick={() => loadPropertyList(listPage + 1)}
                              disabled={listPage >= Math.ceil(listTotal / 30)}
                              className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="py-8 text-center text-gray-500">No properties found</div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Step 2 & 3: Status and upload */}
                {loadingStatus ? (
                  <div className="py-12 text-center text-gray-500">Checking deed status…</div>
                ) : statusData ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                          {statusData.property?.property_no}
                        </h2>
                        {statusData.property?.address && (
                          <p className="text-sm text-gray-600">{statusData.property.address}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={startOver}
                        className="text-sm text-blue-600 hover:text-blue-500"
                      >
                        Choose different property
                      </button>
                    </div>

                    {statusData.status === 'no_deed' && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <p className="text-amber-800 font-medium">
                          No deed found for this property
                        </p>
                        <p className="text-amber-700 text-sm mt-1">
                          Please check back when the deed has been created or uploaded by the Registrar.
                        </p>
                      </div>
                    )}

                    {statusData.status === 'no_hash' && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <p className="text-amber-800 font-medium">
                          Deed exists but hash is not yet computed
                        </p>
                        <p className="text-amber-700 text-sm mt-1">
                          Please come back when the hash of the deed is in place.
                        </p>
                      </div>
                    )}

                    {statusData.status === 'ready' && statusData.document && (
                      <>
                        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                          <p className="text-green-800 font-medium">
                            Deed and hash are available
                          </p>
                          <p className="text-green-700 text-sm mt-1">
                            Upload the document you wish to verify against the stored deed.
                          </p>
                        </div>

                        {!fileResult ? (
                          <form onSubmit={handleVerifySubmit} className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Document to verify (PDF, DOC, DOCX, max 50MB)
                              </label>
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                required
                              />
                            </div>
                            <button
                              type="submit"
                              disabled={submitting || !file}
                              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                              {submitting ? 'Verifying…' : 'Verify document'}
                            </button>
                          </form>
                        ) : (
                          <div
                            className={`rounded-lg border p-4 ${
                              fileResult.verification.status === 'verified'
                                ? 'border-green-200 bg-green-50'
                                : 'border-red-200 bg-red-50'
                            }`}
                          >
                            {fileResult.verification.status === 'verified' ? (
                              <>
                                <p className="text-green-800 font-semibold">
                                  Document wholly verified
                                </p>
                                <p className="text-green-700 text-sm mt-1">
                                  The document submitted is wholly verified and is the true deed of the property.
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-red-800 font-semibold">
                                  Document not verified
                                </p>
                                <p className="text-red-700 text-sm mt-1">
                                  The submitted document is not verified as it does not match the stored records.
                                </p>
                              </>
                            )}
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <dl className="text-xs text-gray-600 space-y-1">
                                <div>
                                  <dt className="inline font-medium">Computed hash: </dt>
                                  <dd className="inline font-mono break-all">
                                    {fileResult.verification.computedHash}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="inline font-medium">Stored hash: </dt>
                                  <dd className="inline font-mono break-all">
                                    {fileResult.verification.storedHash}
                                  </dd>
                                </div>
                              </dl>
                            </div>
                            <button
                              type="button"
                              onClick={resetVerification}
                              className="mt-4 text-sm text-blue-600 hover:text-blue-500"
                            >
                              Verify another document for this property
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
