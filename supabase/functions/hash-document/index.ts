/**
 * Hash Document Edge Function
 * 
 * Supabase Edge Function to compute SHA-256 hashes of uploaded documents
 * and persist hash records in ver_document_hashes table.
 * 
 * Uses Deno runtime with Web Crypto API for streaming hash computation.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// Retry configuration
const DEFAULT_MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 1000 // 1 second
const MAX_RETRY_DELAY_MS = 30000 // 30 seconds
const RETRY_MULTIPLIER = 2

// Initialize Supabase client with service role key for database operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * Check if error is transient (retryable)
 */
function isTransientError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const errorObj = error as Record<string, unknown>
  const message = String(errorObj.message || '').toLowerCase()
  const code = String(errorObj.code || '')

  // Network/timeout errors
  if (
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('etimedout')
  ) {
    return true
  }

  // Database transient errors
  if (
    code === '08000' || // Connection exception
    code === '08003' || // Connection does not exist
    code === '08006' || // Connection failure
    code === '08001' || // SQL client unable to establish connection
    code === '08004' || // SQL server rejected connection
    code === '40001' || // Serialization failure
    code === '40P01' || // Deadlock detected
    message.includes('too many connections') ||
    message.includes('connection pool')
  ) {
    return true
  }

  // Storage transient errors
  if (
    code === '503' || // Service unavailable
    code === '429' || // Too many requests
    message.includes('rate limit') ||
    message.includes('throttle') ||
    message.includes('service unavailable')
  ) {
    return true
  }

  return false
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoffDelay(attempt: number): number {
  const delay = INITIAL_RETRY_DELAY_MS * Math.pow(RETRY_MULTIPLIER, attempt - 1)
  return Math.min(delay, MAX_RETRY_DELAY_MS)
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retry operation with exponential backoff
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = DEFAULT_MAX_RETRIES,
  context?: Record<string, unknown>
): Promise<T> {
  let lastError: unknown
  let attempt = 0

  while (attempt < maxRetries) {
    attempt++

    try {
      const result = await operation()
      
      if (attempt > 1) {
        console.log('Operation succeeded after retry', {
          operationName,
          attempt,
          totalAttempts: attempt,
          ...context,
        })
      }

      return result
    } catch (error) {
      lastError = error

      // Check if error is transient
      if (!isTransientError(error)) {
        console.error('Permanent error, not retrying', {
          operationName,
          attempt,
          error: error instanceof Error ? error.message : String(error),
          ...context,
        })
        throw error
      }

      // If this is the last attempt, throw the error
      if (attempt >= maxRetries) {
        console.error('Max retries exceeded', {
          operationName,
          attempt,
          maxRetries,
          error: error instanceof Error ? error.message : String(error),
          ...context,
        })
        throw error
      }

      // Calculate delay and wait before retry
      const delay = calculateBackoffDelay(attempt)
      console.warn('Transient error detected, retrying', {
        operationName,
        attempt,
        maxRetries,
        delay: `${delay}ms`,
        error: error instanceof Error ? error.message : String(error),
        nextAttempt: attempt + 1,
        ...context,
      })

      await sleep(delay)
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Retry operation failed')
}

/**
 * Progress callback type
 */
type ProgressCallback = (bytesProcessed: number, totalBytes: number) => void

/**
 * Convert ArrayBuffer to hex string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const hashArray = Array.from(new Uint8Array(buffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Compute SHA-256 hash using Web Crypto API
 * For small files, loads entire file into memory
 * 
 * @param file - File to hash
 * @returns SHA-256 hash as hex string
 */
async function computeSha256Hash(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    return arrayBufferToHex(hashBuffer)
  } catch (error) {
    throw new Error(`Failed to compute hash: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Compute SHA-256 hash from stream with chunked processing
 * Processes file in configurable chunks (default 64KB) to avoid memory issues
 * Handles large scanned PDFs incrementally without loading entire file into memory
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
  chunkSize: number = 64 * 1024, // 64KB default as per requirements
  onProgress?: ProgressCallback
): Promise<string> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let bytesProcessed = 0
  let lastProgressUpdate = 0
  const progressUpdateInterval = 1024 * 1024 // Update progress every 1MB

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
      if (onProgress && bytesProcessed - lastProgressUpdate >= progressUpdateInterval) {
        onProgress(bytesProcessed, totalSize)
        lastProgressUpdate = bytesProcessed
      }

      // Check for corrupted data or read failures
      if (bytesProcessed > totalSize * 1.1) {
        // Allow 10% tolerance for size discrepancies
        throw new Error('File size mismatch: processed more bytes than expected file size')
      }
    }

    // Final progress update
    if (onProgress) {
      onProgress(bytesProcessed, totalSize)
    }

    // Combine chunks efficiently
    // For very large files, we process in batches to avoid memory spikes
    const batchSize = 100 // Process 100 chunks at a time
    const combinedChunks: Uint8Array[] = []

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)
      const batchLength = batch.reduce((acc, chunk) => acc + chunk.length, 0)
      const combined = new Uint8Array(batchLength)
      let offset = 0

      for (const chunk of batch) {
        combined.set(chunk, offset)
        offset += chunk.length
      }

      combinedChunks.push(combined)
    }

    // Final combination if we have multiple batches
    let finalData: Uint8Array
    if (combinedChunks.length === 1) {
      finalData = combinedChunks[0]
    } else {
      const totalLength = combinedChunks.reduce((acc, chunk) => acc + chunk.length, 0)
      finalData = new Uint8Array(totalLength)
      let offset = 0
      for (const chunk of combinedChunks) {
        finalData.set(chunk, offset)
        offset += chunk.length
      }
    }

    // Compute hash using Web Crypto API
    const hashBuffer = await crypto.subtle.digest('SHA-256', finalData.buffer)
    return arrayBufferToHex(hashBuffer)

  } catch (error) {
    // Handle read failures and corrupted files
    if (error instanceof Error) {
      if (error.message.includes('size mismatch')) {
        throw new Error(`Corrupted file detected: ${error.message}`)
      }
      if (error.message.includes('read')) {
        throw new Error(`Read failure: ${error.message}`)
      }
      throw new Error(`Hash computation failed: ${error.message}`)
    }
    throw new Error(`Hash computation failed: ${String(error)}`)
  } finally {
    // Ensure reader is released
    try {
      reader.releaseLock()
    } catch (releaseError) {
      // Ignore release errors (reader may already be released)
      console.warn('Failed to release stream reader:', releaseError)
    }
  }
}

/**
 * Compute SHA-256 hash from File object with streaming support
 * Automatically selects optimal method based on file size
 * 
 * @param file - File to hash
 * @param chunkSize - Chunk size in bytes (default: 64KB)
 * @param onProgress - Optional progress callback
 * @returns SHA-256 hash as hex string
 */
async function computeSha256HashFromFile(
  file: File,
  chunkSize: number = 64 * 1024, // 64KB default
  onProgress?: ProgressCallback
): Promise<string> {
  const fileSize = file.size
  const streamingThreshold = 10 * 1024 * 1024 // 10MB threshold

  // For small files, use direct hashing
  if (fileSize < streamingThreshold) {
    return computeSha256Hash(file)
  }

  // For large files, use streaming
  // Convert File to ReadableStream
  const stream = file.stream()
  return computeSha256HashFromStream(stream, fileSize, chunkSize, onProgress)
}

/**
 * Request validation result
 */
interface ValidationResult {
  valid: boolean
  error?: string
  documentId?: string
}

/**
 * Comprehensive request validation
 * 
 * @param body - Request body (parsed JSON)
 * @returns Validation result with extracted document_id if valid
 */
function validateRequest(body: unknown): ValidationResult {
  // Check if body is an object
  if (!body || typeof body !== 'object') {
    console.error('Validation failure: Request body is not an object', { body })
    return { valid: false, error: 'Request body must be a JSON object' }
  }

  const requestBody = body as Record<string, unknown>

  // Check for document_id field
  if (!('document_id' in requestBody)) {
    console.error('Validation failure: document_id missing from request body', { body })
    return { valid: false, error: 'document_id parameter is required' }
  }

  const documentId = requestBody.document_id

  // Check if document_id is a string
  if (typeof documentId !== 'string') {
    console.error('Validation failure: document_id is not a string', { documentId, type: typeof documentId })
    return { valid: false, error: 'document_id must be a string' }
  }

  // Check if document_id is not empty
  if (documentId.trim().length === 0) {
    console.error('Validation failure: document_id is empty', { documentId })
    return { valid: false, error: 'document_id cannot be empty' }
  }

  // Validate UUID format (RFC 4122)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(documentId)) {
    console.error('Validation failure: document_id is not a valid UUID', { documentId })
    return { valid: false, error: 'document_id must be a valid UUID (RFC 4122 format)' }
  }

  return { valid: true, documentId }
}

/**
 * Validate environment configuration
 * 
 * @returns Validation result
 */
function validateEnvironment(): { valid: boolean; error?: string } {
  if (!SUPABASE_URL || SUPABASE_URL.trim().length === 0) {
    console.error('Security event: SUPABASE_URL environment variable is missing or empty')
    return { valid: false, error: 'SUPABASE_URL environment variable is not configured' }
  }

  // Validate URL format
  try {
    new URL(SUPABASE_URL)
  } catch {
    console.error('Security event: SUPABASE_URL is not a valid URL', { url: SUPABASE_URL })
    return { valid: false, error: 'SUPABASE_URL must be a valid URL' }
  }

  if (!SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY.trim().length === 0) {
    console.error('Security event: SUPABASE_SERVICE_ROLE_KEY environment variable is missing or empty')
    return { valid: false, error: 'SUPABASE_SERVICE_ROLE_KEY environment variable is not configured' }
  }

  // Basic validation for service role key format (should be a JWT-like string)
  if (SUPABASE_SERVICE_ROLE_KEY.length < 50) {
    console.error('Security event: SUPABASE_SERVICE_ROLE_KEY appears to be invalid (too short)', {
      keyLength: SUPABASE_SERVICE_ROLE_KEY.length,
    })
    return { valid: false, error: 'SUPABASE_SERVICE_ROLE_KEY appears to be invalid' }
  }

  return { valid: true }
}

/**
 * Retrieve document metadata from database
 * 
 * @param documentId - Document ID (validated UUID)
 * @returns Document metadata or error
 */
async function retrieveDocument(documentId: string): Promise<{
  success: boolean
  document?: { id: string; storage_path: string; status: string; property_id: string; uploader_id: string }
  error?: string
  statusCode?: number
}> {
  try {
    // Retrieve document with all necessary fields
    const { data: document, error: docError } = await supabase
      .from('ver_documents')
      .select('id, storage_path, status, property_id, uploader_id, file_size, mime_type, original_filename')
      .eq('id', documentId)
      .single()

    if (docError) {
      // Check for specific error types
      if (docError.code === 'PGRST116') {
        // No rows returned
        console.error('Document retrieval failure: Document not found', {
          documentId,
          error: docError.message,
          code: docError.code,
        })
        return {
          success: false,
          error: `Document not found: ${documentId}`,
          statusCode: 404,
        }
      }

      // Database connection or query error
      console.error('Document retrieval failure: Database error', {
        documentId,
        error: docError.message,
        code: docError.code,
        details: docError.details,
        hint: docError.hint,
      })
      return {
        success: false,
        error: `Database error while retrieving document: ${docError.message}`,
        statusCode: 500,
      }
    }

    if (!document) {
      console.error('Document retrieval failure: Document is null', { documentId })
      return {
        success: false,
        error: `Document not found: ${documentId}`,
        statusCode: 404,
      }
    }

    // Validate document has required fields
    if (!document.storage_path || document.storage_path.trim().length === 0) {
      console.error('Document validation failure: storage_path is missing or empty', {
        documentId,
        document,
      })
      return {
        success: false,
        error: 'Document is missing storage_path',
        statusCode: 500,
      }
    }

    console.log('Document retrieved successfully', {
      documentId,
      status: document.status,
      hasStoragePath: !!document.storage_path,
      fileSize: document.file_size,
      mimeType: document.mime_type,
    })

    return {
      success: true,
      document: {
        id: document.id,
        storage_path: document.storage_path,
        status: document.status,
        property_id: document.property_id,
        uploader_id: document.uploader_id,
      },
    }
  } catch (error) {
    console.error('Document retrieval exception', {
      documentId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return {
      success: false,
      error: `Unexpected error retrieving document: ${error instanceof Error ? error.message : String(error)}`,
      statusCode: 500,
    }
  }
}

/**
 * Main Edge Function handler
 */
Deno.serve(async (req: Request): Promise<Response> => {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()

  try {
    // Log incoming request
    console.log('Request received', {
      requestId,
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
    })

    // Only allow POST requests
    if (req.method !== 'POST') {
      console.warn('Method not allowed', { requestId, method: req.method })
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.', requestId }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body with error handling
    let body: unknown
    try {
      const contentType = req.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Validation failure: Invalid content type', {
          requestId,
          contentType,
        })
        return new Response(
          JSON.stringify({ error: 'Content-Type must be application/json', requestId }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      body = await req.json()
    } catch (parseError) {
      console.error('Validation failure: Failed to parse request body', {
        requestId,
        error: parseError instanceof Error ? parseError.message : String(parseError),
      })
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON in request body',
          details: parseError instanceof Error ? parseError.message : String(parseError),
          requestId,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate request body
    const validation = validateRequest(body)
    if (!validation.valid) {
      console.error('Validation failure', { requestId, error: validation.error, body })
      return new Response(
        JSON.stringify({ error: validation.error, requestId }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const documentId = validation.documentId!

    // Validate environment configuration
    const envValidation = validateEnvironment()
    if (!envValidation.valid) {
      console.error('Security event: Environment validation failed', {
        requestId,
        documentId,
        error: envValidation.error,
      })
      return new Response(
        JSON.stringify({ error: envValidation.error, requestId }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Retrieve document from database with retry logic
    const documentResult = await retryWithBackoff(
      () => retrieveDocument(documentId),
      'retrieveDocument',
      DEFAULT_MAX_RETRIES,
      { requestId, documentId }
    )

    if (!documentResult.success) {
      return new Response(
        JSON.stringify({
          error: documentResult.error,
          requestId,
          document_id: documentId,
        }),
        {
          status: documentResult.statusCode || 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const document = documentResult.document!

    // Check if document is already hashed
    if (document.status === 'hashed') {
      const { data: existingHash } = await supabase
        .from('ver_document_hashes')
        .select('sha256_hash, created_at')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (existingHash) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Document already hashed',
            document_id: documentId,
            hash: existingHash.sha256_hash,
            created_at: existingHash.created_at,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // Download file from storage with retry logic
    console.log('Downloading file from storage', {
      requestId,
      documentId,
      storagePath: document.storage_path,
    })

    let fileData: Blob
    let downloadError: unknown = null

    try {
      const result = await retryWithBackoff(
        async () => {
          const downloadResult = await supabase.storage
            .from('documents')
            .download(document.storage_path)

          if (downloadResult.error) {
            throw downloadResult.error
          }

          if (!downloadResult.data) {
            throw new Error('File data is null after download')
          }

          return downloadResult.data
        },
        'downloadFile',
        DEFAULT_MAX_RETRIES,
        { requestId, documentId, storagePath: document.storage_path }
      )

      fileData = result
    } catch (error) {
      downloadError = error
    }

    if (downloadError) {
      console.error('Storage download failure', {
        requestId,
        documentId,
        storagePath: document.storage_path,
        error: downloadError.message,
        statusCode: downloadError.statusCode,
      })

      // Handle specific storage errors
      if (downloadError.statusCode === 404) {
        return new Response(
          JSON.stringify({
            error: `File not found in storage: ${document.storage_path}`,
            requestId,
            document_id: documentId,
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }

      if (downloadError.statusCode === 403) {
        console.error('Security event: Access denied to storage file', {
          requestId,
          documentId,
          storagePath: document.storage_path,
        })
        return new Response(
          JSON.stringify({
            error: 'Access denied to file in storage',
            requestId,
            document_id: documentId,
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          error: `Failed to download file from storage: ${downloadError.message}`,
          requestId,
          document_id: documentId,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!fileData) {
      console.error('Storage download failure: File data is null', {
        requestId,
        documentId,
        storagePath: document.storage_path,
      })
      return new Response(
        JSON.stringify({
          error: 'File data is null after download',
          requestId,
          document_id: documentId,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('File downloaded successfully', {
      requestId,
      documentId,
      fileSize: fileData.size,
      fileType: fileData.type,
    })

    // Compute SHA-256 hash with streaming support
    console.log('Starting hash computation', {
      requestId,
      documentId,
      fileSize: fileData.size,
      fileType: fileData.type,
    })

    const hashStartTime = Date.now()
    let hash: string

    try {
      // Progress callback for long-running operations
      const onProgress = (bytesProcessed: number, totalBytes: number) => {
        const percent = Math.round((bytesProcessed / totalBytes) * 100)
        console.log('Hash computation progress', {
          requestId,
          documentId,
          bytesProcessed,
          totalBytes,
          percent: `${percent}%`,
        })
      }

      // Use streaming hash computation with configurable chunk size (64KB default)
      hash = await computeSha256HashFromFile(fileData, 64 * 1024, onProgress)

      const hashDuration = Date.now() - hashStartTime
      console.log('Hash computation completed', {
        requestId,
        documentId,
        hash: hash.substring(0, 16) + '...', // Log first 16 chars for verification
        duration: `${hashDuration}ms`,
        fileSize: fileData.size,
      })
    } catch (hashError) {
      const hashDuration = Date.now() - hashStartTime
      console.error('Hash computation failure', {
        requestId,
        documentId,
        error: hashError instanceof Error ? hashError.message : String(hashError),
        duration: `${hashDuration}ms`,
        fileSize: fileData.size,
      })

      // Handle specific error types
      let errorMessage = 'Failed to compute hash'
      let statusCode = 500

      if (hashError instanceof Error) {
        if (hashError.message.includes('Corrupted file')) {
          errorMessage = 'File appears to be corrupted or invalid'
          statusCode = 422 // Unprocessable Entity
        } else if (hashError.message.includes('Read failure')) {
          errorMessage = 'Failed to read file data'
          statusCode = 500
        } else {
          errorMessage = hashError.message
        }
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
          requestId,
          document_id: documentId,
        }),
        { status: statusCode, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create hash record and update document status atomically
    console.log('Starting database operations', {
      requestId,
      documentId,
      hash: hash.substring(0, 16) + '...',
    })

    const dbStartTime = Date.now()
    const hashRecordId = crypto.randomUUID()
    const hashComputedAt = new Date().toISOString()

    // Step 1: Create hash record in ver_document_hashes with retry logic
    let hashRecord: { id: string; sha256_hash: string; algorithm: string; created_at: string }
    let hashInsertError: unknown = null

    try {
      const result = await retryWithBackoff(
        async () => {
          const insertResult = await supabase
            .from('ver_document_hashes')
            .insert({
              id: hashRecordId,
              document_id: documentId,
              sha256_hash: hash,
              algorithm: 'SHA-256',
              created_at: hashComputedAt,
            })
            .select()
            .single()

          if (insertResult.error) {
            throw insertResult.error
          }

          if (!insertResult.data) {
            throw new Error('Hash record creation returned null')
          }

          return insertResult.data
        },
        'createHashRecord',
        DEFAULT_MAX_RETRIES,
        { requestId, documentId, hashRecordId }
      )

      hashRecord = result
    } catch (error) {
      hashInsertError = error
    }

    if (hashInsertError) {
      const error = hashInsertError as { message?: string; code?: string; details?: string; hint?: string }
      console.error('Hash record creation failure', {
        requestId,
        documentId,
        error: error.message || String(hashInsertError),
        code: error.code,
        details: error.details,
        hint: error.hint,
      })

      // Handle specific constraint violations
      let errorMessage = 'Failed to create hash record'
      let statusCode = 500

      if (error.code === '23505') {
        // Unique constraint violation (duplicate hash)
        errorMessage = 'Hash record already exists for this document'
        statusCode = 409 // Conflict
      } else if (error.code === '23503') {
        // Foreign key constraint violation
        errorMessage = 'Document not found or invalid document_id'
        statusCode = 404
      } else if (error.code === '23502') {
        // Not null constraint violation
        errorMessage = 'Required fields missing in hash record'
        statusCode = 400
      } else {
        errorMessage = `Database error: ${error.message || String(hashInsertError)}`
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
          requestId,
          document_id: documentId,
          code: error.code,
        }),
        { status: statusCode, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!hashRecord) {
      console.error('Hash record creation failure: Record is null', {
        requestId,
        documentId,
      })
      return new Response(
        JSON.stringify({
          error: 'Hash record creation returned null',
          requestId,
          document_id: documentId,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('Hash record created successfully', {
      requestId,
      documentId,
      hashRecordId: hashRecord.id,
    })

    // Step 2: Update document status to 'hashed' with retry logic (atomic operation)
    const { data: updatedDocument, error: updateError } = await retryWithBackoff(
      async () => {
        const result = await supabase
          .from('ver_documents')
          .update({
            status: 'hashed',
            hash_computed_at: hashComputedAt,
            updated_at: hashComputedAt,
          })
          .eq('id', documentId)
          .select()
          .single()

        if (result.error) {
          throw result.error
        }

        if (!result.data) {
          throw new Error('Document update returned null')
        }

        return result
      },
      'updateDocumentStatus',
      DEFAULT_MAX_RETRIES,
      { requestId, documentId, hashRecordId: hashRecord.id }
    )

    if (updateError) {
      // Rollback: Delete the hash record we just created
      console.error('Document status update failure, rolling back hash record', {
        requestId,
        documentId,
        hashRecordId: hashRecord.id,
        error: updateError.message,
        code: updateError.code,
      })

      const { error: rollbackError } = await supabase
        .from('ver_document_hashes')
        .delete()
        .eq('id', hashRecord.id)

      if (rollbackError) {
        console.error('Rollback failure: Could not delete hash record', {
          requestId,
          documentId,
          hashRecordId: hashRecord.id,
          rollbackError: rollbackError.message,
        })
        // Log but continue - we'll return the update error
      }

      // Handle specific constraint violations
      let errorMessage = 'Failed to update document status'
      let statusCode = 500

      if (updateError.code === '23503') {
        // Foreign key constraint violation
        errorMessage = 'Document not found or invalid document_id'
        statusCode = 404
      } else if (updateError.code === '23502') {
        // Not null constraint violation
        errorMessage = 'Required fields missing in document update'
        statusCode = 400
      } else if (updateError.code === 'PGRST116') {
        // No rows updated
        errorMessage = 'Document not found or already updated'
        statusCode = 404
      } else {
        errorMessage = `Database error: ${updateError.message}`
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
          requestId,
          document_id: documentId,
          code: updateError.code,
          rollback: 'Hash record creation was rolled back',
        }),
        { status: statusCode, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!updatedDocument) {
      // Rollback: Delete the hash record we just created
      console.error('Document status update failure: Document is null, rolling back', {
        requestId,
        documentId,
        hashRecordId: hashRecord.id,
      })

      const { error: rollbackError } = await supabase
        .from('ver_document_hashes')
        .delete()
        .eq('id', hashRecord.id)

      if (rollbackError) {
        console.error('Rollback failure: Could not delete hash record', {
          requestId,
          documentId,
          hashRecordId: hashRecord.id,
        })
      }

      return new Response(
        JSON.stringify({
          error: 'Document update returned null',
          requestId,
          document_id: documentId,
          rollback: 'Hash record creation was rolled back',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const dbDuration = Date.now() - dbStartTime
    console.log('Database operations completed successfully', {
      requestId,
      documentId,
      hashRecordId: hashRecord.id,
      documentStatus: updatedDocument.status,
      duration: `${dbDuration}ms`,
    })

    // Log successful completion
    const totalDuration = Date.now() - startTime
    console.log('Hash computation and database operations completed successfully', {
      requestId,
      documentId,
      hash: hashRecord.sha256_hash.substring(0, 16) + '...',
      hashRecordId: hashRecord.id,
      documentStatus: updatedDocument.status,
      hashComputedAt: hashRecord.created_at,
      totalDuration: `${totalDuration}ms`,
    })

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        document_id: documentId,
        hash: hashRecord.sha256_hash,
        algorithm: hashRecord.algorithm,
        created_at: hashRecord.created_at,
        document_status: updatedDocument.status,
        hash_computed_at: updatedDocument.hash_computed_at,
        requestId,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('Edge Function error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
    })

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
        requestId,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
