/**
 * Property Import API Route
 * 
 * Handles bulk property import from CSV/JSON files with multiple geometry formats
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI } from '@/lib/auth/require-role'
import { bulkImportProperties, logPropertyImport } from '@/lib/db/properties-import'
import { handleApiError } from '@/lib/errors'
import {
  parseCSV,
  parseJSON,
  convertToPropertyInsert,
  validatePropertyRecord,
  type BulkImportResult,
} from '@/lib/utils/property-import'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/properties/import
 * 
 * Import properties from CSV or JSON file
 */
export async function POST(request: NextRequest) {
  const importStartTime = Date.now()
  const importId = crypto.randomUUID()

  try {
    // Require verifier role or higher
    await requireRoleAPI('verifier')

    // Get authenticated user for logging
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const fileFormat = formData.get('format') as string | null // 'csv' or 'json'
    const skipDuplicates = formData.get('skip_duplicates') === 'true'
    const detectGeometryOverlaps = formData.get('detect_geometry_overlaps') === 'true'
    const overlapThreshold = formData.get('overlap_threshold')
      ? parseFloat(formData.get('overlap_threshold') as string)
      : 0.8
    const batchSize = formData.get('batch_size')
      ? parseInt(formData.get('batch_size') as string, 10)
      : 50

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    // Determine file format
    let format: 'csv' | 'json' = 'json'
    if (fileFormat) {
      format = fileFormat.toLowerCase() as 'csv' | 'json'
    } else {
      // Auto-detect from file name or content type
      const fileName = file.name.toLowerCase()
      const contentType = file.type

      if (fileName.endsWith('.csv') || contentType === 'text/csv') {
        format = 'csv'
      } else if (fileName.endsWith('.json') || contentType === 'application/json') {
        format = 'json'
      }
    }

    // Read file content
    const fileContent = await file.text()

    // Parse file based on format
    let records: Array<Record<string, unknown>> = []

    try {
      if (format === 'csv') {
        records = parseCSV(fileContent)
      } else {
        records = parseJSON(fileContent)
      }
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Failed to parse file',
          details: error instanceof Error ? error.message : 'Parse error',
        },
        { status: 400 }
      )
    }

    if (records.length === 0) {
      return NextResponse.json({ error: 'No records found in file' }, { status: 400 })
    }

    // Convert records to PropertyInsert
    const properties: Array<{ property: any; rowNumber: number }> = []
    const parseErrors: Array<{ rowNumber: number; error: string; errorCode: string }> = []

    for (let i = 0; i < records.length; i++) {
      const record = records[i]
      const rowNumber = i + 1

      try {
        const property = convertToPropertyInsert(record, rowNumber)

        // Validate property
        const validation = validatePropertyRecord(property, rowNumber)
        if (!validation.valid) {
          parseErrors.push({
            rowNumber,
            error: validation.error || 'Validation failed',
            errorCode: 'VALIDATION_ERROR',
          })
          continue
        }

        properties.push({ property, rowNumber })
      } catch (error) {
        parseErrors.push({
          rowNumber,
          error: error instanceof Error ? error.message : 'Parse error',
          errorCode: 'PARSE_ERROR',
        })
      }
    }

    // Import properties
    const importResults = await bulkImportProperties(
      properties.map((p) => p.property),
      {
        skipDuplicates,
        detectGeometryOverlaps,
        overlapThreshold,
        batchSize,
      }
    )

    // Combine parse errors with import results
    const allErrors = [
      ...parseErrors,
      ...importResults
        .filter((r) => !r.success)
        .map((r) => ({
          rowNumber: r.rowNumber || 0,
          property_no: r.property_no,
          error: r.error || 'Import failed',
          errorCode: r.errorCode || 'IMPORT_ERROR',
        })),
    ]

    const successful = importResults.filter((r) => r.success).length
    const failed = importResults.filter((r) => !r.success).length
    const skipped = parseErrors.length

    const durationMs = Date.now() - importStartTime

    // Log import history
    await logPropertyImport(user.id, importId, records.length, successful, failed + skipped, skipped, allErrors)

    // Build result
    const result: BulkImportResult = {
      total: records.length,
      successful,
      failed,
      skipped,
      results: importResults,
      errors: allErrors,
      importId,
      durationMs,
    }

    return NextResponse.json(
      {
        message: 'Import completed',
        import: result,
      },
      { status: 200 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}
