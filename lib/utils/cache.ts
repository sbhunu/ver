/**
 * Report Cache Utilities
 * 
 * Utilities for caching reports in Supabase Storage
 */

import { createClient } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  DEFAULT_TTL_SECONDS: 3600, // 1 hour
  MAX_TTL_SECONDS: 86400, // 24 hours
  COMPRESSION_THRESHOLD: 1024 * 1024, // 1MB - compress files larger than this
} as const

/**
 * Generate cache key from report parameters
 */
export function generateCacheKey(
  reportType: string,
  format: string,
  filters: Record<string, unknown>,
  userId?: string
): string {
  const parts = [
    reportType,
    format,
    userId || 'all',
    JSON.stringify(filters, Object.keys(filters).sort()), // Sorted for consistency
  ]

  // Create hash of filters for shorter key
  const filtersHash = Buffer.from(JSON.stringify(filters))
    .toString('base64')
    .replace(/[+/=]/g, '')
    .substring(0, 16)

  return `${reportType}:${format}:${userId || 'all'}:${filtersHash}`
}

/**
 * Get cached report
 */
export async function getCachedReport(cacheKey: string): Promise<{
  data: Blob | string
  contentType: string
  recordCount: number
} | null> {
  const supabase = await createClient()

  // Check cache metadata
  const { data: cache, error } = await supabase
    .from('ver_report_cache')
    .select('*')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !cache) {
    return null
  }

  // Update access statistics
  await supabase
    .from('ver_report_cache')
    .update({
      last_accessed_at: new Date().toISOString(),
      access_count: cache.access_count + 1,
    })
    .eq('id', cache.id)

  // Download from storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('report-cache')
    .download(cache.storage_path)

  if (downloadError || !fileData) {
    console.error('Failed to download cached report:', downloadError)
    return null
  }

  // Decompress if needed
  let data: Blob | string = fileData
  if (cache.compressed) {
    // Decompress (would need decompression logic)
    // For now, return as-is
    data = fileData
  }

  // Determine content type
  const contentType =
    cache.format === 'csv'
      ? 'text/csv; charset=utf-8'
      : cache.format === 'pdf'
      ? 'text/html; charset=utf-8'
      : 'application/json'

  return {
    data,
    contentType,
    recordCount: cache.record_count,
  }
}

/**
 * Store report in cache
 */
export async function setCachedReport(
  cacheKey: string,
  reportType: string,
  format: string,
  filters: Record<string, unknown>,
  data: Blob | string,
  recordCount: number,
  ttlSeconds: number = CACHE_CONFIG.DEFAULT_TTL_SECONDS
): Promise<void> {
  const supabase = await createClient()

  // Determine if compression is needed
  const dataSize = typeof data === 'string' ? new Blob([data]).size : data.size
  const shouldCompress = dataSize > CACHE_CONFIG.COMPRESSION_THRESHOLD

  // Compress if needed (simplified - in production, use proper compression)
  let finalData = data
  let compressed = false
  if (shouldCompress && typeof data === 'string') {
    // In production, use gzip compression
    // For now, just store as-is
    finalData = data
    compressed = false // Set to true when compression is implemented
  }

  // Generate storage path
  const timestamp = Date.now()
  const extension = format === 'csv' ? 'csv' : format === 'pdf' ? 'html' : 'json'
  const storagePath = `reports/${reportType}/${timestamp}-${cacheKey.substring(0, 16)}.${extension}`

  // Upload to storage
  const uploadData = typeof finalData === 'string' ? new Blob([finalData]) : finalData
  const { error: uploadError } = await supabase.storage
    .from('report-cache')
    .upload(storagePath, uploadData, {
      contentType:
        format === 'csv'
          ? 'text/csv'
          : format === 'pdf'
          ? 'text/html'
          : 'application/json',
      upsert: true,
    })

  if (uploadError) {
    throw new DatabaseError(`Failed to cache report: ${uploadError.message}`, uploadError)
  }

  // Calculate expiration
  const expiresAt = new Date()
  expiresAt.setSeconds(expiresAt.getSeconds() + ttlSeconds)

  // Store cache metadata
  const { error: insertError } = await supabase.from('ver_report_cache').upsert(
    {
      cache_key: cacheKey,
      report_type: reportType,
      format: format,
      filters: filters,
      storage_path: storagePath,
      file_size: dataSize,
      compressed: compressed,
      record_count: recordCount,
      expires_at: expiresAt.toISOString(),
      last_accessed_at: new Date().toISOString(),
      access_count: 0,
    },
    {
      onConflict: 'cache_key',
    }
  )

  if (insertError) {
    // Clean up uploaded file
    await supabase.storage.from('report-cache').remove([storagePath])
    throw new DatabaseError(`Failed to store cache metadata: ${insertError.message}`, insertError)
  }
}

/**
 * Invalidate cache for a report type
 */
export async function invalidateCache(
  reportType?: string,
  filters?: Record<string, unknown>
): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('invalidate_report_cache', {
    p_report_type: reportType || null,
    p_filters: filters || null,
  })

  if (error) {
    throw new DatabaseError(`Failed to invalidate cache: ${error.message}`, error)
  }

  return (data as number) || 0
}

/**
 * Clean expired cache entries
 */
export async function cleanExpiredCache(): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('clean_expired_report_cache')

  if (error) {
    throw new DatabaseError(`Failed to clean expired cache: ${error.message}`, error)
  }

  return (data as number) || 0
}
