'use client'

/**
 * Verify Page View
 *
 * Document selection, file upload for hash comparison, verification decision form,
 * and batch verification. Task Reference: 7.2, 7.3
 */

import { useState, useCallback } from 'react'
import Link from 'next/link'

type Doc = {
  id: string
  doc_number: string
  original_filename: string | null
  file_size: number | null
  status: string
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
    fileInfo: { fileSize: number; mimeType: string; fileName?: string; computationDurationMs: number }
  }
}

type BatchRow = { documentId: string; file: File | null }

const ROLE_DASHBOARDS: Record<string, string> = {
  staff: '/dashboard/staff',
  verifier: '/dashboard/verifier',
  chief_registrar: '/dashboard/chief-registrar',
  admin: '/dashboard/admin',
}

export interface VerifyPageViewProps {
  documents: Doc[]
  user: { id: string; email: string; role: string }
}

type Tab = 'file' | 'manual' | 'batch'

export default function VerifyPageView({ documents, user }: VerifyPageViewProps) {
  const [tab, setTab] = useState<Tab>('file')
  const [selectedId, setSelectedId] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [manualDecision, setManualDecision] = useState<'verified' | 'rejected' | ''>('')
  const [manualReason, setManualReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileResult, setFileResult] = useState<VerifyWithFileResult['data'] | null>(null)
  const [manualSuccess, setManualSuccess] = useState(false)
  const [batchRows, setBatchRows] = useState<BatchRow[]>([{ documentId: '', file: null }])
  const [batchResults, setBatchResults] = useState<Array<{ documentId: string; docNumber: string; ok: boolean; error?: string; data?: VerifyWithFileResult['data'] }>>([])

  const dashboardHref = ROLE_DASHBOARDS[user.role] ?? '/dashboard/verifier'

  const resetFileState = useCallback(() => {
    setFile(null)
    setFileResult(null)
    setError(null)
  }, [])

  const resetManualState = useCallback(() => {
    setManualDecision('')
    setManualReason('')
    setManualSuccess(false)
    setError(null)
  }, [])

  const addBatchRow = () => {
    setBatchRows((r) => [...r, { documentId: '', file: null }])
  }

  const updateBatchRow = (idx: number, upd: Partial<BatchRow>) => {
    setBatchRows((r) => r.map((row, i) => (i === idx ? { ...row, ...upd } : row)))
  }

  const removeBatchRow = (idx: number) => {
    setBatchRows((r) => r.filter((_, i) => i !== idx))
  }

  const handleVerifyWithFile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedId || !file) {
      setError('Select a document and choose a file.')
      return
    }
    setSubmitting(true)
    setError(null)
    setFileResult(null)
    try {
      const form = new FormData()
      form.set('file', file)
      form.set('documentId', selectedId)
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

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedId || !manualDecision) {
      setError('Select a document and choose verified or rejected.')
      return
    }
    if (manualDecision === 'rejected' && !manualReason.trim()) {
      setError('Reason is required for rejected documents.')
      return
    }
    setSubmitting(true)
    setError(null)
    setManualSuccess(false)
    try {
      const res = await fetch('/api/verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: selectedId,
          status: manualDecision,
          reason: manualDecision === 'rejected' ? manualReason : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error ?? 'Verification failed')
      }
      setManualSuccess(true)
      setManualDecision('')
      setManualReason('')
      setSelectedId('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBatchVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    const valid = batchRows.filter((r) => r.documentId && r.file)
    if (valid.length === 0) {
      setError('Add at least one document and file.')
      return
    }
    setSubmitting(true)
    setError(null)
    setBatchResults([])
    const results: typeof batchResults = []
    for (const row of valid) {
      const doc = documents.find((d) => d.id === row.documentId)
      const form = new FormData()
      form.set('file', row.file!)
      form.set('documentId', row.documentId)
      try {
        const res = await fetch('/api/verifications/verify-with-file', {
          method: 'POST',
          body: form,
        })
        const json = await res.json()
        if (res.ok && json?.success && json?.data) {
          results.push({
            documentId: row.documentId,
            docNumber: doc?.doc_number ?? row.documentId.slice(0, 8),
            ok: true,
            data: json.data,
          })
        } else {
          results.push({
            documentId: row.documentId,
            docNumber: doc?.doc_number ?? row.documentId.slice(0, 8),
            ok: false,
            error: json?.error ?? `HTTP ${res.status}`,
          })
        }
      } catch (err) {
        results.push({
          documentId: row.documentId,
          docNumber: doc?.doc_number ?? row.documentId.slice(0, 8),
          ok: false,
          error: err instanceof Error ? err.message : 'Request failed',
        })
      }
    }
    setBatchResults(results)
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link href={dashboardHref} className="text-sm font-medium text-blue-600 hover:text-blue-500">
            ← Dashboard
          </Link>
          <span className="text-gray-400">|</span>
          <Link href="/documents" className="text-sm font-medium text-blue-600 hover:text-blue-500">
            Documents
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Verify Documents</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Compare uploads with stored hashes or record manual verification decisions
            </p>
          </div>

          {documents.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No documents ready for verification. Documents must be in &quot;hashed&quot; status.
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="px-6 pt-4 flex gap-2 border-b border-gray-200">
                <button
                  type="button"
                  onClick={() => { setTab('file'); resetFileState(); resetManualState(); }}
                  className={`px-4 py-2 text-sm font-medium rounded-t-md ${
                    tab === 'file' ? 'bg-gray-100 text-gray-900 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Verify with file
                </button>
                <button
                  type="button"
                  onClick={() => { setTab('manual'); resetFileState(); resetManualState(); }}
                  className={`px-4 py-2 text-sm font-medium rounded-t-md ${
                    tab === 'manual' ? 'bg-gray-100 text-gray-900 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Manual decision
                </button>
                <button
                  type="button"
                  onClick={() => { setTab('batch'); setError(null); setBatchResults([]); }}
                  className={`px-4 py-2 text-sm font-medium rounded-t-md ${
                    tab === 'batch' ? 'bg-gray-100 text-gray-900 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Batch verify
                </button>
              </div>

              <div className="p-6">
                {error && (
                  <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
                )}

                {tab === 'file' && (
                  <form onSubmit={handleVerifyWithFile} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Document</label>
                      <select
                        value={selectedId}
                        onChange={(e) => { setSelectedId(e.target.value); setFileResult(null); }}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        required
                      >
                        <option value="">Select…</option>
                        {documents.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.doc_number} — {d.original_filename ?? 'Untitled'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">File to compare (PDF, DOC, DOCX, max 50MB)</label>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {submitting ? 'Verifying…' : 'Verify'}
                    </button>
                    {fileResult && (
                      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Hash comparison results</h3>
                        <dl className="space-y-2 text-sm">
                          <div>
                            <dt className="text-gray-500">Result</dt>
                            <dd>
                              <span className={fileResult.verification.status === 'verified' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                {fileResult.verification.status === 'verified' ? '✓ Verified' : '✗ Rejected'}
                              </span>
                              {fileResult.verification.hashMatch ? ' — hashes match' : ' — hashes do not match'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">Computed hash</dt>
                            <dd className="font-mono text-xs break-all">{fileResult.verification.computedHash}</dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">Stored hash</dt>
                            <dd className="font-mono text-xs break-all">{fileResult.verification.storedHash}</dd>
                          </div>
                          {fileResult.verification.reason && (
                            <div>
                              <dt className="text-gray-500">Reason</dt>
                              <dd>{fileResult.verification.reason}</dd>
                            </div>
                          )}
                          {fileResult.verification.discrepancyMetadata && Object.keys(fileResult.verification.discrepancyMetadata).length > 0 && (
                            <div>
                              <dt className="text-gray-500">Discrepancies</dt>
                              <dd>
                                <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-auto max-h-32">
                                  {JSON.stringify(fileResult.verification.discrepancyMetadata, null, 2)}
                                </pre>
                              </dd>
                            </div>
                          )}
                          <div>
                            <dt className="text-gray-500">Duration</dt>
                            <dd>{fileResult.fileInfo.computationDurationMs} ms</dd>
                          </div>
                        </dl>
                      </div>
                    )}
                  </form>
                )}

                {tab === 'manual' && (
                  <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Document</label>
                      <select
                        value={selectedId}
                        onChange={(e) => { setSelectedId(e.target.value); setManualSuccess(false); }}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        required
                      >
                        <option value="">Select…</option>
                        {documents.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.doc_number} — {d.original_filename ?? 'Untitled'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className="block text-sm font-medium text-gray-700 mb-2">Decision</span>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="decision"
                            value="verified"
                            checked={manualDecision === 'verified'}
                            onChange={() => setManualDecision('verified')}
                            className="mr-2"
                          />
                          <span className="text-sm">Verified</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="decision"
                            value="rejected"
                            checked={manualDecision === 'rejected'}
                            onChange={() => setManualDecision('rejected')}
                            className="mr-2"
                          />
                          <span className="text-sm">Rejected</span>
                        </label>
                      </div>
                    </div>
                    {manualDecision === 'rejected' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason (required)</label>
                        <textarea
                          value={manualReason}
                          onChange={(e) => setManualReason(e.target.value)}
                          rows={3}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          placeholder="Reason for rejection…"
                          required={manualDecision === 'rejected'}
                        />
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {submitting ? 'Submitting…' : 'Submit'}
                    </button>
                    {manualSuccess && (
                      <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
                        Verification recorded successfully.
                      </div>
                    )}
                  </form>
                )}

                {tab === 'batch' && (
                  <form onSubmit={handleBatchVerify} className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Add document–file pairs. Each file is verified against the stored hash for that document.
                    </p>
                    {batchRows.map((row, idx) => (
                      <div key={idx} className="flex flex-wrap items-end gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Document</label>
                          <select
                            value={row.documentId}
                            onChange={(e) => updateBatchRow(idx, { documentId: e.target.value })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          >
                            <option value="">Select…</option>
                            {documents.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.doc_number} — {d.original_filename ?? 'Untitled'}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-xs font-medium text-gray-500 mb-1">File</label>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={(e) => updateBatchRow(idx, { file: e.target.files?.[0] ?? null })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeBatchRow(idx)}
                          className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={addBatchRow}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Add row
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {submitting ? 'Verifying…' : 'Verify all'}
                      </button>
                    </div>
                    {batchResults.length > 0 && (
                      <div className="mt-6 overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Document</th>
                              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Detail</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {batchResults.map((r, i) => (
                              <tr key={i}>
                                <td className="px-4 py-3 text-sm text-gray-900">{r.docNumber}</td>
                                <td className="px-4 py-3">
                                  <span className={r.ok ? 'text-green-600' : 'text-red-600'}>
                                    {r.ok ? 'Verified' : 'Failed'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {r.ok
                                    ? (r.data?.verification.hashMatch ? 'Hash match' : 'Hash mismatch')
                                    : r.error}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
