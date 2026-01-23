/**
 * Multipart Upload API Route
 * 
 * Handles chunked file uploads and combines chunks into final file
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UploadError } from '@/lib/errors'

/**
 * POST /api/upload/multipart
 * Upload a chunk of a multipart upload
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const chunk = formData.get('chunk') as File
    const path = formData.get('path') as string
    const chunkIndex = parseInt(formData.get('chunkIndex') as string, 10)
    const totalChunks = parseInt(formData.get('totalChunks') as string, 10)
    const bucket = formData.get('bucket') as string || 'documents'

    if (!chunk || !path || isNaN(chunkIndex) || isNaN(totalChunks)) {
      return NextResponse.json(
        { error: 'Missing required fields: chunk, path, chunkIndex, totalChunks' },
        { status: 400 }
      )
    }

    // Upload chunk with temporary path
    const chunkPath = `${path}.part${chunkIndex}`
    const chunkBuffer = await chunk.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(chunkPath, chunkBuffer, {
        upsert: true,
      })

    if (uploadError) {
      throw new UploadError(
        `Failed to upload chunk ${chunkIndex}: ${uploadError.message}`,
        { chunkIndex, totalChunks, path }
      )
    }

    return NextResponse.json({
      success: true,
      chunkIndex,
      totalChunks,
      chunkPath,
    })
  } catch (error) {
    console.error('Multipart upload error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/upload/multipart
 * Combine chunks into final file
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { path, totalChunks, bucket = 'documents' } = body

    if (!path || !totalChunks) {
      return NextResponse.json(
        { error: 'Missing required fields: path, totalChunks' },
        { status: 400 }
      )
    }

    // Download all chunks
    const chunks: ArrayBuffer[] = []
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = `${path}.part${i}`
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(chunkPath)

      if (error || !data) {
        throw new UploadError(
          `Failed to download chunk ${i}: ${error?.message || 'Unknown error'}`,
          { chunkIndex: i, path }
        )
      }

      const arrayBuffer = await data.arrayBuffer()
      chunks.push(arrayBuffer)
    }

    // Combine chunks into single buffer
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
    const combinedBuffer = new Uint8Array(totalSize)
    let offset = 0

    for (const chunk of chunks) {
      combinedBuffer.set(new Uint8Array(chunk), offset)
      offset += chunk.byteLength
    }

    // Upload combined file
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, combinedBuffer, {
        upsert: false,
        contentType: 'application/octet-stream',
      })

    if (uploadError) {
      throw new UploadError(
        `Failed to upload combined file: ${uploadError.message}`,
        { path }
      )
    }

    // Clean up chunk files
    const chunkPaths = Array.from({ length: totalChunks }, (_, i) => `${path}.part${i}`)
    await supabase.storage.from(bucket).remove(chunkPaths)

    return NextResponse.json({
      success: true,
      path,
    })
  } catch (error) {
    console.error('Chunk combination error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to combine chunks',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/upload/multipart
 * Clean up partial uploads
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')
    const totalChunks = parseInt(searchParams.get('totalChunks') || '0', 10)
    const bucket = searchParams.get('bucket') || 'documents'

    if (!path || !totalChunks) {
      return NextResponse.json(
        { error: 'Missing required parameters: path, totalChunks' },
        { status: 400 }
      )
    }

    // Remove all chunk files
    const chunkPaths = Array.from({ length: totalChunks }, (_, i) => `${path}.part${i}`)
    const { error } = await supabase.storage.from(bucket).remove(chunkPaths)

    if (error) {
      return NextResponse.json(
        { error: `Failed to clean up chunks: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      cleaned: chunkPaths.length,
    })
  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to clean up',
      },
      { status: 500 }
    )
  }
}
