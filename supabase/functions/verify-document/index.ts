/**
 * Verify Document Edge Function
 * 
 * Supabase Edge Function to verify uploaded documents by re-hashing
 * and comparing against stored hashes with decision logging.
 * 
 * Uses Deno runtime with Web Crypto API for streaming hash computation.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// File validation constants
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
] as const

// Hash computation constants
const DEFAULT_CHUNK_SIZE = 64 * 1024 // 64KB
const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024 // 10MB - use streaming for files larger than this
const PROGRESS_UPDATE_INTERVAL = 1024 * 1024 // Update progress every 1MB

// Batch processing constants
const MAX_BATCH_SIZE = 10 // Maximum documents per batch request
const MAX_BATCH_TOTAL_SIZE = 500 * 1024 * 1024 // 500MB total size limit for batch
const BATCH_RATE_LIMIT_PER_MINUTE = 60 // Maximum batch requests per minute per verifier

// Initialize Supabase client with service role key for database operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * CORS headers for cross-origin requests
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * Create error response with CORS headers
 */
function createErrorResponse(
  status: number,
  message: string,
  details?: Record<string, unknown>
): Response {
  return new Response(
    JSON.stringify({
      error: message,
      ...details,
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  )
}

/**
 * Create success response with CORS headers
 */
function createSuccessResponse(data: unknown): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
    }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  )
}

/**
 * Validate environment variables
 */
function validateEnvironment(): { valid: boolean; error?: string } {
  if (!SUPABASE_URL) {
    return { valid: false, error: 'SUPABASE_URL environment variable is not set' }
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return { valid: false, error: 'SUPABASE_SERVICE_ROLE_KEY environment variable is not set' }
  }

  return { valid: true }
}

/**
 * Validate file size
 */
function validateFileSize(size: number): { valid: boolean; error?: string } {
  if (size <= 0) {
    return { valid: false, error: 'File size must be greater than 0' }
  }

  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size (${(size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${MAX_FILE_SIZE / 1024 / 1024}MB)`,
    }
  }

  return { valid: true }
}

/**
 * Validate MIME type
 */
function validateMimeType(mimeType: string): { valid: boolean; error?: string } {
  if (!mimeType || typeof mimeType !== 'string') {
    return { valid: false, error: 'MIME type is required' }
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType as typeof ALLOWED_MIME_TYPES[number])) {
    return {
      valid: false,
      error: `MIME type '${mimeType}' is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
    }
  }

  return { valid: true }
}

/**
 * Validate request body
 */
function validateRequest(body: unknown): {
  valid: boolean
  error?: string
  data?: {
    documentId: string
    verifierId: string
    file?: File | ArrayBuffer | Uint8Array
    fileSize?: number
    mimeType?: string
    reason?: string
    verificationStoragePath?: string
  }
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required and must be an object' }
  }

  const requestBody = body as Record<string, unknown>

  // Validate documentId
  if (!requestBody.documentId || typeof requestBody.documentId !== 'string') {
    return { valid: false, error: 'documentId is required and must be a string' }
  }

  // Validate UUID format for documentId
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(requestBody.documentId)) {
    return { valid: false, error: 'documentId must be a valid UUID' }
  }

  // Validate verifierId
  if (!requestBody.verifierId || typeof requestBody.verifierId !== 'string') {
    return { valid: false, error: 'verifierId is required and must be a string' }
  }

  if (!uuidRegex.test(requestBody.verifierId)) {
    return { valid: false, error: 'verifierId must be a valid UUID' }
  }

  // Validate file if provided
  if (requestBody.file) {
    // File can be base64 string, ArrayBuffer, or File object
    // We'll validate size and MIME type if provided
    if (requestBody.fileSize) {
      const sizeValidation = validateFileSize(requestBody.fileSize as number)
      if (!sizeValidation.valid) {
        return { valid: false, error: sizeValidation.error }
      }
    }

    if (requestBody.mimeType) {
      const mimeValidation = validateMimeType(requestBody.mimeType as string)
      if (!mimeValidation.valid) {
        return { valid: false, error: mimeValidation.error }
      }
    }
  }

  return {
    valid: true,
    data: {
      documentId: requestBody.documentId,
      verifierId: requestBody.verifierId,
      file: requestBody.file as File | ArrayBuffer | Uint8Array | undefined,
      fileSize: requestBody.fileSize as number | undefined,
      mimeType: requestBody.mimeType as string | undefined,
      reason: requestBody.reason as string | undefined,
      verificationStoragePath: requestBody.verificationStoragePath as string | undefined,
    },
  }
}

/**
 * Convert ArrayBuffer to hex string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Compute SHA-256 hash from ArrayBuffer
 */
async function computeSha256Hash(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return arrayBufferToHex(hashBuffer)
}

/**
 * Progress callback type
 */
type ProgressCallback = (bytesProcessed: number, totalBytes: number) => void

/**
 * Compute SHA-256 hash from stream with chunked processing
 * Processes file in configurable chunks to avoid memory issues
 * Handles large files incrementally without loading entire file into memory
 * 
 * @param stream - ReadableStream to hash
 * @param totalSize - Total file size in bytes (for progress tracking)
 * @param chunkSize - Chunk size in bytes (default: 64KB)
 * @param onProgress - Optional progress callback
 * @returns SHA-256 hash as hex string
 */
async function computeSha256HashFromStream(
  stream: ReadableStream<Uint8Array>,
  totalSize: number,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  onProgress?: ProgressCallback
): Promise<string> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let bytesProcessed = 0
  let lastProgressUpdate = 0

  try {
    // Read stream in chunks
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      if (!value || value.length === 0) {
        continue
      }

      // Store chunk
      chunks.push(value)
      bytesProcessed += value.length

      // Update progress (throttled to avoid excessive logging)
      if (onProgress && bytesProcessed - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL) {
        onProgress(bytesProcessed, totalSize)
        lastProgressUpdate = bytesProcessed
      }

      // Check for corrupted data or read failures
      if (bytesProcessed > totalSize * 1.1) {
        throw new Error(
          `File size mismatch: expected ${totalSize} bytes, but read ${bytesProcessed} bytes`
        )
      }
    }

    // Combine all chunks for hash computation
    // Note: Web Crypto API doesn't support incremental hashing,
    // so we need to combine chunks before hashing
    // For very large files, this could still use significant memory
    // In production, consider using a streaming hash library if available
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    const combined = new Uint8Array(totalLength)
    let offset = 0

    for (const chunk of chunks) {
      combined.set(chunk, offset)
      offset += chunk.length
    }

    // Final progress update
    if (onProgress) {
      onProgress(bytesProcessed, totalSize)
    }

    // Compute hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', combined.buffer)
    return arrayBufferToHex(hashBuffer)
  } catch (error) {
    throw new Error(
      `Failed to compute hash from stream: ${error instanceof Error ? error.message : String(error)}`
    )
  } finally {
    reader.releaseLock()
  }
}

/**
 * Compute SHA-256 hash from File object
 * Automatically selects streaming or direct method based on file size
 * 
 * @param file - File to hash
 * @param onProgress - Optional progress callback
 * @returns SHA-256 hash as hex string
 */
async function computeSha256HashFromFile(
  file: File,
  onProgress?: ProgressCallback
): Promise<string> {
  // Validate file size
  const sizeValidation = validateFileSize(file.size)
  if (!sizeValidation.valid) {
    throw new Error(sizeValidation.error || 'Invalid file size')
  }

  // Validate MIME type
  const mimeValidation = validateMimeType(file.type)
  if (!mimeValidation.valid) {
    throw new Error(mimeValidation.error || 'Invalid MIME type')
  }

  // Use streaming for large files, direct method for small files
  if (file.size > LARGE_FILE_THRESHOLD) {
    console.log(`Using streaming hash computation for large file (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
    const stream = file.stream()
    return computeSha256HashFromStream(stream, file.size, DEFAULT_CHUNK_SIZE, onProgress)
  } else {
    console.log(`Using direct hash computation for small file (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
    return computeSha256Hash(await file.arrayBuffer())
  }
}

/**
 * Parse multipart form data
 */
async function parseMultipartFormData(
  request: Request
): Promise<Map<string, string | File>> {
  const formData = await request.formData()
  const result = new Map<string, string | File>()

  for (const [key, value] of formData.entries()) {
    result.set(key, value)
  }

  return result
}

/**
 * Extract file from request
 * Supports both multipart form data and JSON with base64/file data
 */
async function extractFileFromRequest(request: Request): Promise<{
  file: File | ArrayBuffer | Uint8Array
  fileSize: number
  mimeType: string
  fileName?: string
} | null> {
  const contentType = request.headers.get('content-type') || ''

  // Check if multipart form data
  if (contentType.includes('multipart/form-data')) {
    const formData = await parseMultipartFormData(request)
    const file = formData.get('file')

    if (file instanceof File) {
      return {
        file,
        fileSize: file.size,
        mimeType: file.type,
        fileName: file.name,
      }
    }

    return null
  }

  // Check if JSON with file data
  if (contentType.includes('application/json')) {
    const body = await request.json()
    
    if (body.file) {
      // Handle base64 encoded file
      if (typeof body.file === 'string') {
        // Base64 string
        const base64Data = body.file.replace(/^data:.*,/, '') // Remove data URL prefix
        const binaryString = atob(base64Data)
        const bytes = new Uint8Array(binaryString.length)
        
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }

        return {
          file: bytes,
          fileSize: bytes.length,
          mimeType: body.mimeType || 'application/octet-stream',
          fileName: body.fileName,
        }
      }

      // Handle ArrayBuffer or Uint8Array
      if (body.file instanceof ArrayBuffer || body.file instanceof Uint8Array) {
        const fileSize = body.fileSize || (body.file as ArrayBuffer).byteLength || (body.file as Uint8Array).length
        return {
          file: body.file,
          fileSize,
          mimeType: body.mimeType || 'application/octet-stream',
          fileName: body.fileName,
        }
      }
    }
  }

  return null
}

/**
 * Retrieve document from database
 */
async function retrieveDocument(documentId: string): Promise<{
  success: boolean
  error?: string
  document?: {
    id: string
    property_id: string
    doc_number: string
    uploader_id: string
    status: string
    storage_path: string
    file_size: number | null
    mime_type: string | null
    original_filename: string | null
    hash_computed_at: string | null
    created_at: string
    updated_at: string
  }
}> {
  try {
    const { data: document, error } = await supabase
      .from('ver_documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Document not found' }
      }
      console.error('Failed to retrieve document:', error)
      return { success: false, error: `Failed to retrieve document: ${error.message}` }
    }

    if (!document) {
      return { success: false, error: 'Document not found' }
    }

    return { success: true, document: document as any }
  } catch (error) {
    console.error('Error retrieving document:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error retrieving document',
    }
  }
}

/**
 * Get latest stored hash for document
 */
async function getLatestStoredHash(documentId: string): Promise<{
  success: boolean
  error?: string
  hash?: {
    id: string
    document_id: string
    sha256_hash: string
    algorithm: string
    created_at: string
  }
}> {
  try {
    const { data: hash, error } = await supabase
      .from('ver_document_hashes')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'No stored hash found for document' }
      }
      console.error('Failed to retrieve stored hash:', error)
      return { success: false, error: `Failed to retrieve stored hash: ${error.message}` }
    }

    if (!hash) {
      return { success: false, error: 'No stored hash found for document' }
    }

    return { success: true, hash: hash as any }
  } catch (error) {
    console.error('Error retrieving stored hash:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error retrieving stored hash',
    }
  }
}

/**
 * Constant-time hash comparison to prevent timing attacks
 * 
 * Compares two hash strings in constant time regardless of where
 * the first difference occurs. This prevents timing-based attacks
 * that could reveal information about the hash value.
 * 
 * @param hash1 - First hash to compare
 * @param hash2 - Second hash to compare
 * @returns True if hashes match, false otherwise
 */
function constantTimeHashCompare(hash1: string, hash2: string): boolean {
  // Normalize hashes to lowercase for comparison
  const h1 = hash1.toLowerCase()
  const h2 = hash2.toLowerCase()

  // If lengths differ, hashes don't match
  if (h1.length !== h2.length) {
    return false
  }

  // Constant-time comparison: always compare all bytes
  // Use bitwise XOR and accumulate result
  let result = 0
  for (let i = 0; i < h1.length; i++) {
    result |= h1.charCodeAt(i) ^ h2.charCodeAt(i)
  }

  // Return true only if all bytes matched (result is 0)
  return result === 0
}

/**
 * Collect discrepancy metadata for verification
 */
function collectDiscrepancyMetadata(
  document: {
    file_size: number | null
    mime_type: string | null
    hash_computed_at: string | null
    created_at: string
  },
  storedHash: {
    sha256_hash: string
    algorithm: string
    created_at: string
  },
  verificationData: {
    computedHash: string
    fileSize: number
    mimeType: string
    fileName?: string
    computationDurationMs: number
  }
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {}

  // File size difference
  if (document.file_size !== null) {
    const sizeDifference = verificationData.fileSize - document.file_size
    if (sizeDifference !== 0) {
      metadata.file_size_difference = sizeDifference
      metadata.file_size_difference_percent = ((sizeDifference / document.file_size) * 100).toFixed(2)
    }
    metadata.original_file_size = document.file_size
    metadata.verification_file_size = verificationData.fileSize
  } else {
    metadata.original_file_size = null
    metadata.verification_file_size = verificationData.fileSize
  }

  // MIME type comparison
  if (document.mime_type) {
    metadata.mime_type_match = document.mime_type === verificationData.mimeType
    metadata.original_mime_type = document.mime_type
    metadata.verification_mime_type = verificationData.mimeType
  } else {
    metadata.original_mime_type = null
    metadata.verification_mime_type = verificationData.mimeType
  }

  // Timestamp variations
  const hashComputedAt = document.hash_computed_at
    ? new Date(document.hash_computed_at).getTime()
    : null
  const storedHashCreatedAt = new Date(storedHash.created_at).getTime()
  const verificationTime = Date.now()

  if (hashComputedAt) {
    metadata.time_since_hash_computation_ms = verificationTime - hashComputedAt
    metadata.time_since_hash_computation_days = (
      (verificationTime - hashComputedAt) /
      (1000 * 60 * 60 * 24)
    ).toFixed(2)
  }

  metadata.time_since_stored_hash_creation_ms = verificationTime - storedHashCreatedAt
  metadata.time_since_stored_hash_creation_days = (
    (verificationTime - storedHashCreatedAt) /
    (1000 * 60 * 60 * 24)
  ).toFixed(2)

  // Hash algorithm version
  metadata.stored_hash_algorithm = storedHash.algorithm
  metadata.computed_hash_algorithm = 'SHA-256' // Always SHA-256 for now
  metadata.algorithm_match = storedHash.algorithm === 'SHA-256'

  // Computation performance
  metadata.computation_duration_ms = verificationData.computationDurationMs

  // File metadata
  if (verificationData.fileName) {
    metadata.verification_file_name = verificationData.fileName
  }

  return metadata
}

/**
 * Make verification decision based on hash comparison and discrepancies
 */
function makeVerificationDecision(
  hashMatch: boolean,
  discrepancyMetadata: Record<string, unknown>,
  providedReason?: string
): {
  status: 'verified' | 'rejected'
  reason: string
  reasonCode: string
} {
  if (hashMatch) {
    // Hash matches - verify document
    const reasons: string[] = ['Hash match confirmed']

    // Check for significant discrepancies even with hash match
    const sizeDifference = discrepancyMetadata.file_size_difference as number | undefined
    if (sizeDifference !== undefined && Math.abs(sizeDifference) > 0) {
      reasons.push(`File size difference: ${sizeDifference} bytes (may indicate metadata changes)`)
    }

    const mimeTypeMatch = discrepancyMetadata.mime_type_match as boolean | undefined
    if (mimeTypeMatch === false) {
      reasons.push('MIME type mismatch (hash matches but type differs)')
    }

    return {
      status: 'verified',
      reason: providedReason || reasons.join('. '),
      reasonCode: 'HASH_MATCH',
    }
  } else {
    // Hash mismatch - reject document
    const reasons: string[] = ['Hash mismatch detected']

    // Add specific discrepancy details
    const sizeDifference = discrepancyMetadata.file_size_difference as number | undefined
    if (sizeDifference !== undefined) {
      if (Math.abs(sizeDifference) > 0) {
        reasons.push(`File size difference: ${sizeDifference} bytes`)
      }
    }

    const mimeTypeMatch = discrepancyMetadata.mime_type_match as boolean | undefined
    if (mimeTypeMatch === false) {
      reasons.push('MIME type mismatch')
    }

    const algorithmMatch = discrepancyMetadata.algorithm_match as boolean | undefined
    if (algorithmMatch === false) {
      reasons.push('Hash algorithm mismatch')
    }

    return {
      status: 'rejected',
      reason: providedReason || reasons.join('. '),
      reasonCode: 'HASH_MISMATCH',
    }
  }
}

/**
 * Create verification record and update document status atomically
 * 
 * Implements atomic transaction pattern:
 * 1. Create ver_verifications record
 * 2. Update ver_documents status
 * 3. Rollback verification record if update fails
 */
async function createVerificationRecordAndUpdateDocument(
  documentId: string,
  verifierId: string,
  status: 'verified' | 'rejected',
  reason: string,
  discrepancyMetadata: Record<string, unknown>,
  verificationStoragePath: string | null
): Promise<{
  success: boolean
  error?: string
  details?: Record<string, unknown>
  verificationId?: string
  createdAt?: string
  documentStatus?: string
  documentUpdatedAt?: string
}> {
  const verificationId = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  try {
    // Prepare discrepancy metadata for database
    // Convert to DiscrepancyMetadata format
    const dbDiscrepancyMetadata: {
      file_size_difference?: number
      hash_mismatch?: boolean
      other_discrepancies?: Record<string, unknown>
    } = {}

    if (discrepancyMetadata.file_size_difference !== undefined) {
      dbDiscrepancyMetadata.file_size_difference = discrepancyMetadata.file_size_difference as number
    }

    if (status === 'rejected') {
      dbDiscrepancyMetadata.hash_mismatch = true
    }

    // Include other discrepancies
    const otherDiscrepancies: Record<string, unknown> = {}
    if (discrepancyMetadata.mime_type_match === false) {
      otherDiscrepancies.mime_type_mismatch = true
    }
    if (discrepancyMetadata.algorithm_match === false) {
      otherDiscrepancies.algorithm_mismatch = true
    }
    if (Object.keys(otherDiscrepancies).length > 0) {
      dbDiscrepancyMetadata.other_discrepancies = otherDiscrepancies
    }

    // Step 1: Create verification record
    console.log('Creating verification record', {
      verificationId,
      documentId,
      verifierId,
      status,
    })

    const { data: verificationRecord, error: verificationError } = await supabase
      .from('ver_verifications')
      .insert({
        id: verificationId,
        document_id: documentId,
        verifier_id: verifierId,
        status,
        reason: status === 'rejected' ? reason : reason || null,
        verification_storage_path: verificationStoragePath,
        discrepancy_metadata: status === 'rejected' && Object.keys(dbDiscrepancyMetadata).length > 0
          ? dbDiscrepancyMetadata
          : null,
        created_at: createdAt,
      })
      .select()
      .single()

    if (verificationError) {
      console.error('Failed to create verification record:', verificationError)

      // Handle constraint violations
      if (verificationError.code === '23503') {
        return {
          success: false,
          error: 'Document or verifier not found',
          details: { code: verificationError.code, hint: verificationError.hint },
        }
      }

      if (verificationError.code === '23502') {
        return {
          success: false,
          error: 'Required field missing in verification record',
          details: { code: verificationError.code, hint: verificationError.hint },
        }
      }

      return {
        success: false,
        error: `Failed to create verification record: ${verificationError.message}`,
        details: { code: verificationError.code },
      }
    }

    if (!verificationRecord) {
      return {
        success: false,
        error: 'Verification record creation returned null',
      }
    }

    console.log('Verification record created successfully', { verificationId })

    // Step 2: Update document status
    const newDocumentStatus = status === 'verified' ? 'verified' : 'rejected'
    const updatedAt = new Date().toISOString()

    console.log('Updating document status', {
      documentId,
      newStatus: newDocumentStatus,
    })

    const { data: updatedDocument, error: updateError } = await supabase
      .from('ver_documents')
      .update({
        status: newDocumentStatus,
        updated_at: updatedAt,
      })
      .eq('id', documentId)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update document status:', updateError)

      // Rollback: Delete verification record
      console.log('Rolling back verification record due to update failure', {
        verificationId,
      })

      const { error: rollbackError } = await supabase
        .from('ver_verifications')
        .delete()
        .eq('id', verificationId)

      if (rollbackError) {
        console.error('Failed to rollback verification record:', rollbackError)
        // Log but don't fail - verification record will be orphaned
        // This should be rare and can be cleaned up manually
      }

      // Handle constraint violations
      if (updateError.code === 'PGRST116') {
        return {
          success: false,
          error: 'Document not found',
          details: {
            code: updateError.code,
            rollback: 'Verification record creation was rolled back',
          },
        }
      }

      return {
        success: false,
        error: `Failed to update document status: ${updateError.message}`,
        details: {
          code: updateError.code,
          rollback: 'Verification record creation was rolled back',
        },
      }
    }

    if (!updatedDocument) {
      // Rollback verification record
      await supabase.from('ver_verifications').delete().eq('id', verificationId)

      return {
        success: false,
        error: 'Document update returned null',
        details: { rollback: 'Verification record creation was rolled back' },
      }
    }

    console.log('Document status updated successfully', {
      documentId,
      status: newDocumentStatus,
    })

    return {
      success: true,
      verificationId,
      createdAt,
      documentStatus: newDocumentStatus,
      documentUpdatedAt: updatedAt,
    }
  } catch (error) {
    console.error('Unexpected error in atomic transaction:', error)

    // Attempt rollback
    try {
      await supabase.from('ver_verifications').delete().eq('id', verificationId)
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError)
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in atomic transaction',
      details: { rollback: 'Verification record creation was rolled back' },
    }
  }
}

/**
 * Create audit log entry for verification
 */
async function createVerificationAuditLog(
  verifierId: string,
  documentId: string,
  verificationId: string,
  status: 'verified' | 'rejected',
  reason: string,
  hashMatch: boolean,
  discrepancyMetadata: Record<string, unknown>
): Promise<void> {
  try {
    const auditDetails = {
      document_id: documentId,
      verification_id: verificationId,
      status,
      reason,
      hash_match: hashMatch,
      discrepancy_metadata: discrepancyMetadata,
    }

    const { error: auditError } = await supabase.from('ver_logs').insert({
      actor_id: verifierId,
      action: 'verify',
      target_type: 'verification',
      target_id: verificationId,
      details: auditDetails,
    })

    if (auditError) {
      // Log error but don't fail verification
      console.error('Failed to create audit log for verification:', auditError)
    } else {
      console.log('Audit log created for verification', { verificationId })
    }
  } catch (error) {
    // Log error but don't fail verification
    console.error('Error creating audit log:', error)
  }
}

/**
 * Handle OPTIONS request for CORS preflight
 */
function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  })
}

/**
 * Validate batch verification request
 */
function validateBatchRequest(body: unknown): {
  valid: boolean
  error?: string
  data?: BatchVerificationRequest
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' }
  }

  const requestBody = body as Record<string, unknown>

  // Check if this is a batch request
  if (!('items' in requestBody) || !Array.isArray(requestBody.items)) {
    return { valid: false, error: 'Batch request must include "items" array' }
  }

  // Validate verifier ID
  if (!('verifierId' in requestBody) || typeof requestBody.verifierId !== 'string') {
    return { valid: false, error: 'verifierId is required and must be a string' }
  }

  // Validate UUID format for verifierId
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(requestBody.verifierId)) {
    return { valid: false, error: 'verifierId must be a valid UUID' }
  }

  // Validate batch size
  const items = requestBody.items as unknown[]
  if (items.length === 0) {
    return { valid: false, error: 'Batch request must include at least one item' }
  }

  if (items.length > MAX_BATCH_SIZE) {
    return {
      valid: false,
      error: `Batch size (${items.length}) exceeds maximum allowed (${MAX_BATCH_SIZE})`,
    }
  }

  // Validate each item
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (!item || typeof item !== 'object') {
      return { valid: false, error: `Item ${i + 1} must be an object` }
    }

    const itemObj = item as Record<string, unknown>

    // Validate documentId
    if (!('documentId' in itemObj) || typeof itemObj.documentId !== 'string') {
      return { valid: false, error: `Item ${i + 1}: documentId is required and must be a string` }
    }

    if (!uuidRegex.test(itemObj.documentId as string)) {
      return { valid: false, error: `Item ${i + 1}: documentId must be a valid UUID` }
    }

    // Validate file size if provided
    if ('fileSize' in itemObj && itemObj.fileSize !== null && itemObj.fileSize !== undefined) {
      if (typeof itemObj.fileSize !== 'number' || itemObj.fileSize <= 0) {
        return { valid: false, error: `Item ${i + 1}: fileSize must be a positive number` }
      }
    }

    // Validate MIME type if provided
    if ('mimeType' in itemObj && itemObj.mimeType !== null && itemObj.mimeType !== undefined) {
      if (typeof itemObj.mimeType !== 'string') {
        return { valid: false, error: `Item ${i + 1}: mimeType must be a string` }
      }
    }
  }

  return {
    valid: true,
    data: requestBody as BatchVerificationRequest,
  }
}

/**
 * Check rate limit for batch requests
 */
async function checkRateLimit(verifierId: string): Promise<{
  allowed: boolean
  error?: string
}> {
  // Simple in-memory rate limiting (for production, use Redis or similar)
  // This is a basic implementation - in production, use a proper rate limiting service
  const now = Date.now()
  const minuteAgo = now - 60 * 1000

  // TODO: Implement proper rate limiting with persistent storage
  // For now, we'll allow all requests but log them
  console.log('Rate limit check (not enforced in current implementation)', {
    verifierId,
    timestamp: now,
  })

  return { allowed: true }
}

/**
 * Process single verification item in batch
 */
async function processBatchItem(
  item: BatchVerificationItem,
  verifierId: string,
  batchId: string
): Promise<VerificationResult> {
  const startTime = Date.now()
  const { documentId, file, fileSize, mimeType, fileName, reason, verificationStoragePath } = item

  try {
    console.log(`[Batch ${batchId}] Processing document ${documentId}`)

    // Validate file size
    const sizeValidation = validateFileSize(fileSize)
    if (!sizeValidation.valid) {
      return {
        documentId,
        success: false,
        error: sizeValidation.error || 'Invalid file size',
        errorCode: 'INVALID_FILE_SIZE',
        processingTimeMs: Date.now() - startTime,
      }
    }

    // Validate MIME type
    const mimeValidation = validateMimeType(mimeType)
    if (!mimeValidation.valid) {
      return {
        documentId,
        success: false,
        error: mimeValidation.error || 'Invalid MIME type',
        errorCode: 'INVALID_MIME_TYPE',
        processingTimeMs: Date.now() - startTime,
      }
    }

    // Retrieve document
    const documentResult = await retrieveDocument(documentId)
    if (!documentResult.success) {
      return {
        documentId,
        success: false,
        error: documentResult.error || 'Document not found',
        errorCode: 'DOCUMENT_NOT_FOUND',
        processingTimeMs: Date.now() - startTime,
      }
    }

    const document = documentResult.document

    // Get latest stored hash
    const hashResult = await getLatestStoredHash(documentId)
    if (!hashResult.success) {
      return {
        documentId,
        success: false,
        error: hashResult.error || 'No stored hash found',
        errorCode: 'HASH_NOT_FOUND',
        processingTimeMs: Date.now() - startTime,
      }
    }

    const storedHash = hashResult.hash

    // Compute hash
    let computedHash: string
    try {
      if (file instanceof File) {
        computedHash = await computeSha256HashFromFile(file)
      } else if (file instanceof ArrayBuffer) {
        computedHash = await computeSha256Hash(file)
      } else if (file instanceof Uint8Array) {
        computedHash = await computeSha256Hash(file.buffer)
      } else {
        return {
          documentId,
          success: false,
          error: 'Unsupported file format',
          errorCode: 'UNSUPPORTED_FILE_FORMAT',
          processingTimeMs: Date.now() - startTime,
        }
      }
    } catch (hashError) {
      return {
        documentId,
        success: false,
        error: hashError instanceof Error ? hashError.message : 'Hash computation failed',
        errorCode: 'HASH_COMPUTATION_FAILED',
        processingTimeMs: Date.now() - startTime,
      }
    }

    // Compare hashes
    const hashMatch = constantTimeHashCompare(computedHash, storedHash.sha256_hash)

    // Collect discrepancy metadata
    const discrepancyMetadata = collectDiscrepancyMetadata(
      document,
      storedHash,
      {
        computedHash,
        fileSize,
        mimeType,
        fileName,
        computationDurationMs: Date.now() - startTime,
      }
    )

    // Make verification decision
    const verificationDecision = makeVerificationDecision(
      hashMatch,
      discrepancyMetadata,
      reason
    )

    // Create verification record and update document
    const verificationResult = await createVerificationRecordAndUpdateDocument(
      documentId,
      verifierId,
      verificationDecision.status,
      verificationDecision.reason,
      discrepancyMetadata,
      verificationStoragePath || null
    )

    if (!verificationResult.success) {
      return {
        documentId,
        success: false,
        error: verificationResult.error || 'Failed to create verification record',
        errorCode: 'VERIFICATION_CREATION_FAILED',
        processingTimeMs: Date.now() - startTime,
      }
    }

    // Create audit log (non-blocking)
    await createVerificationAuditLog(
      verifierId,
      documentId,
      verificationResult.verificationId!,
      verificationDecision.status,
      verificationDecision.reason,
      hashMatch,
      discrepancyMetadata
    )

    return {
      documentId,
      success: true,
      status: verificationDecision.status,
      hashMatch,
      computedHash,
      storedHash: storedHash.sha256_hash,
      verificationId: verificationResult.verificationId,
      discrepancyMetadata,
      processingTimeMs: Date.now() - startTime,
    }
  } catch (error) {
    console.error(`[Batch ${batchId}] Error processing document ${documentId}:`, error)
    return {
      documentId,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'PROCESSING_ERROR',
      processingTimeMs: Date.now() - startTime,
    }
  }
}

/**
 * Process batch verification request
 */
async function processBatchVerification(
  request: BatchVerificationRequest,
  batchId: string
): Promise<BatchVerificationResult> {
  const batchStartTime = Date.now()
  const { verifierId, items } = request

  // Check rate limit
  const rateLimitCheck = await checkRateLimit(verifierId)
  if (!rateLimitCheck.allowed) {
    throw new Error(rateLimitCheck.error || 'Rate limit exceeded')
  }

  // Calculate total size
  const totalSize = items.reduce((sum, item) => sum + (item.fileSize || 0), 0)
  if (totalSize > MAX_BATCH_TOTAL_SIZE) {
    throw new Error(
      `Total batch size (${(totalSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed (${MAX_BATCH_TOTAL_SIZE / 1024 / 1024}MB)`
    )
  }

  console.log(`[Batch ${batchId}] Starting batch verification`, {
    verifierId,
    itemCount: items.length,
    totalSize: `${(totalSize / 1024 / 1024).toFixed(2)}MB`,
  })

  // Process items sequentially to avoid overwhelming the system
  // In production, you might want to process in parallel with concurrency limits
  const results: VerificationResult[] = []
  const rollbacks: string[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]

    // Extract file from item
    // For batch requests, files should be provided as base64 strings in JSON
    // or as multipart form data (more complex to parse)
    let file: File | ArrayBuffer | Uint8Array | null = null

    if (item.file) {
      if (item.file instanceof File) {
        file = item.file
      } else if (item.file instanceof ArrayBuffer) {
        file = item.file
      } else if (item.file instanceof Uint8Array) {
        file = item.file
      } else if (typeof item.file === 'string') {
        // Base64 string - decode it
        try {
          const binaryString = atob(item.file)
          const bytes = new Uint8Array(binaryString.length)
          for (let j = 0; j < binaryString.length; j++) {
            bytes[j] = binaryString.charCodeAt(j)
          }
          file = bytes
        } catch (decodeError) {
          results.push({
            documentId: item.documentId,
            success: false,
            error: 'Failed to decode base64 file data',
            errorCode: 'FILE_DECODE_ERROR',
          })
          continue
        }
      }
    }

    if (!file) {
      results.push({
        documentId: item.documentId,
        success: false,
        error: 'File is required for batch verification',
        errorCode: 'FILE_MISSING',
      })
      continue
    }

    // Process item
    const result = await processBatchItem(
      {
        documentId: item.documentId,
        file,
        fileSize: item.fileSize || (file instanceof File ? file.size : (file as ArrayBuffer).byteLength),
        mimeType: item.mimeType || 'application/octet-stream',
        fileName: item.fileName,
        reason: item.reason,
        verificationStoragePath: item.verificationStoragePath,
      },
      verifierId,
      batchId
    )

    results.push(result)

    // Track rollbacks
    if (!result.success && result.errorCode === 'VERIFICATION_CREATION_FAILED') {
      rollbacks.push(item.documentId)
    }
  }

  const successful = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length

  console.log(`[Batch ${batchId}] Batch verification completed`, {
    successful,
    failed,
    totalProcessingTimeMs: Date.now() - batchStartTime,
  })

  return {
    batchId,
    totalItems: items.length,
    successful,
    failed,
    results,
    totalProcessingTimeMs: Date.now() - batchStartTime,
    rollbacks,
  }
}

/**
 * Main handler for verify-document Edge Function
 */
Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleOptions()
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return createErrorResponse(405, 'Method not allowed. Only POST is supported.')
  }

  try {
    // Validate environment
    const envValidation = validateEnvironment()
    if (!envValidation.valid) {
      console.error('Environment validation failed:', envValidation.error)
      return createErrorResponse(500, envValidation.error || 'Environment validation failed')
    }

    // Parse request body
    let requestBody: unknown
    try {
      requestBody = await req.json()
    } catch (error) {
      console.error('Failed to parse request body:', error)
      return createErrorResponse(400, 'Invalid JSON in request body')
    }

    // Check if this is a batch request
    const batchValidation = validateBatchRequest(requestBody)
    if (batchValidation.valid && batchValidation.data) {
      // Process batch verification
      const batchId = crypto.randomUUID()
      console.log(`Starting batch verification: ${batchId}`)

      try {
        const batchResult = await processBatchVerification(batchValidation.data, batchId)
        return createSuccessResponse({
          message: 'Batch verification completed',
          batch: batchResult,
        })
      } catch (batchError) {
        console.error('Batch verification failed:', batchError)
        return createErrorResponse(
          500,
          batchError instanceof Error ? batchError.message : 'Batch verification failed',
          {
            batchId,
            error: 'BATCH_PROCESSING_ERROR',
          }
        )
      }
    }

    // Process single verification request
    // Validate request
    const validation = validateRequest(requestBody)
    if (!validation.valid || !validation.data) {
      console.error('Request validation failed:', validation.error)
      return createErrorResponse(400, validation.error || 'Request validation failed')
    }

    const { documentId, verifierId, reason, verificationStoragePath } = validation.data

    // Log verification start
    console.log(`Starting verification for document ${documentId} by verifier ${verifierId}`)

    // Extract file from request
    const fileData = await extractFileFromRequest(req)

    if (!fileData) {
      return createErrorResponse(400, 'File is required. Provide file in multipart form data or JSON body.')
    }

    const { file, fileSize, mimeType, fileName } = fileData

    // Validate file size
    const sizeValidation = validateFileSize(fileSize)
    if (!sizeValidation.valid) {
      return createErrorResponse(400, sizeValidation.error || 'Invalid file size')
    }

    // Validate MIME type
    const mimeValidation = validateMimeType(mimeType)
    if (!mimeValidation.valid) {
      return createErrorResponse(400, mimeValidation.error || 'Invalid MIME type')
    }

    console.log(`Processing verification file: ${fileName || 'unnamed'}, size: ${(fileSize / 1024 / 1024).toFixed(2)}MB, type: ${mimeType}`)

    // Compute SHA-256 hash
    let computedHash: string
    const startTime = Date.now()

    try {
      // Progress tracking callback
      const onProgress = (bytesProcessed: number, totalBytes: number) => {
        const percent = ((bytesProcessed / totalBytes) * 100).toFixed(1)
        console.log(`Hash computation progress: ${percent}% (${(bytesProcessed / 1024 / 1024).toFixed(2)}MB / ${(totalBytes / 1024 / 1024).toFixed(2)}MB)`)
      }

      if (file instanceof File) {
        computedHash = await computeSha256HashFromFile(file, onProgress)
      } else if (file instanceof ArrayBuffer) {
        computedHash = await computeSha256Hash(file)
      } else if (file instanceof Uint8Array) {
        computedHash = await computeSha256Hash(file.buffer)
      } else {
        return createErrorResponse(400, 'Unsupported file format')
      }

      const duration = Date.now() - startTime
      console.log(`Hash computation completed in ${duration}ms: ${computedHash}`)

      // Retrieve document and latest hash
      const documentResult = await retrieveDocument(documentId)
      if (!documentResult.success) {
        return createErrorResponse(404, documentResult.error || 'Document not found')
      }

      const document = documentResult.document

      // Get latest stored hash
      const hashResult = await getLatestStoredHash(documentId)
      if (!hashResult.success) {
        return createErrorResponse(404, hashResult.error || 'No stored hash found for document')
      }

      const storedHash = hashResult.hash

      // Compare hashes using constant-time comparison
      const hashMatch = constantTimeHashCompare(computedHash, storedHash.sha256_hash)

      // Collect discrepancy metadata
      const discrepancyMetadata = collectDiscrepancyMetadata(
        document,
        storedHash,
        {
          computedHash,
          fileSize,
          mimeType,
          fileName,
          computationDurationMs: duration,
        }
      )

      // Determine verification status and reason
      const verificationDecision = makeVerificationDecision(
        hashMatch,
        discrepancyMetadata,
        reason
      )

      console.log(`Verification decision: ${verificationDecision.status} - ${verificationDecision.reason}`)

      // Store verification file if path provided (optional)
      // TODO: Implement verification file storage in subsequent task
      // For now, use the provided path or null
      const finalVerificationStoragePath = verificationStoragePath || null
      if (finalVerificationStoragePath) {
        console.log('Verification file storage path provided:', finalVerificationStoragePath)
        // File storage will be implemented in a future task
      }

      // Create verification record and update document status atomically
      const verificationResult = await createVerificationRecordAndUpdateDocument(
        documentId,
        verifierId,
        verificationDecision.status,
        verificationDecision.reason,
        discrepancyMetadata,
        finalVerificationStoragePath
      )

      if (!verificationResult.success) {
        return createErrorResponse(
          500,
          verificationResult.error || 'Failed to create verification record',
          verificationResult.details
        )
      }

      // Create audit log entry
      await createVerificationAuditLog(
        verifierId,
        documentId,
        verificationResult.verificationId,
        verificationDecision.status,
        verificationDecision.reason,
        hashMatch,
        discrepancyMetadata
      )

      return createSuccessResponse({
        message: 'Verification completed',
        documentId,
        verifierId,
        verification: {
          id: verificationResult.verificationId,
          status: verificationDecision.status,
          reason: verificationDecision.reason,
          hashMatch,
          computedHash,
          storedHash: storedHash.sha256_hash,
          discrepancyMetadata,
          verificationStoragePath: finalVerificationStoragePath,
          createdAt: verificationResult.createdAt,
        },
        document: {
          id: documentId,
          status: verificationResult.documentStatus,
          updatedAt: verificationResult.documentUpdatedAt,
        },
        fileInfo: {
          fileSize,
          mimeType,
          fileName,
          computationDurationMs: duration,
        },
      })
    } catch (error) {
      console.error('Hash computation failed:', error)
      return createErrorResponse(
        500,
        'Failed to compute file hash',
        {
          message: error instanceof Error ? error.message : String(error),
        }
      )
    }
  } catch (error) {
    console.error('Unexpected error in verify-document function:', error)
    return createErrorResponse(
      500,
      'Internal server error',
      {
        message: error instanceof Error ? error.message : String(error),
      }
    )
  }
})
