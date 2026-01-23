/**
 * Verification API Route
 * 
 * Handles document verification decisions
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errors'
import type { VerificationInsert } from '@/lib/types'

/**
 * POST /api/verifications
 * 
 * Create a verification decision for a document
 */
export async function POST(request: NextRequest) {
  try {
    // Require verifier role or higher
    const user = await requireRoleAPI('verifier')

    const body = await request.json()
    const { document_id, status, reason, verification_storage_path, discrepancy_metadata } = body

    if (!document_id || !status) {
      return NextResponse.json(
        { error: 'document_id and status are required' },
        { status: 400 }
      )
    }

    if (status === 'rejected' && !reason) {
      return NextResponse.json(
        { error: 'reason is required for rejected verifications' },
        { status: 400 }
      )
    }

    // Verify document exists and is in hashed status
    const supabase = await createClient()
    const { data: document, error: docError } = await supabase
      .from('ver_documents')
      .select('id, status')
      .eq('id', document_id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    if (document.status !== 'hashed') {
      return NextResponse.json(
        { error: 'Document must be in hashed status for verification' },
        { status: 400 }
      )
    }

    // Create verification record
    const verificationData: VerificationInsert = {
      document_id,
      verifier_id: user.id,
      status: status as 'verified' | 'rejected',
      reason: reason || null,
      verification_storage_path: verification_storage_path || null,
      discrepancy_metadata: discrepancy_metadata || null,
    }

    const { data: verification, error: verError } = await supabase
      .from('ver_verifications')
      .insert(verificationData)
      .select()
      .single()

    if (verError || !verification) {
      return NextResponse.json(
        { error: verError?.message || 'Failed to create verification' },
        { status: 500 }
      )
    }

    // Update document status
    const newStatus = status === 'verified' ? 'verified' : 'rejected'
    const { error: updateError } = await supabase
      .from('ver_documents')
      .update({ status: newStatus })
      .eq('id', document_id)

    if (updateError) {
      console.error('Error updating document status:', updateError)
      // Don't fail the request, but log the error
    }

    return NextResponse.json(
      {
        success: true,
        verification,
      },
      { status: 201 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}
