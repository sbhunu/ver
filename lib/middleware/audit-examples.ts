/**
 * Audit Middleware Usage Examples
 * 
 * Examples of how to use the audit middleware in API routes and server actions
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAudit } from './audit'
import { requireRoleAPI, UserRole } from '@/lib/auth'
import { logServerAction } from './audit'

// ============================================================================
// API Route Examples
// ============================================================================

/**
 * Example 1: Basic API route with audit logging
 */
export async function GET(request: NextRequest) {
  return withAudit(request, async (req) => {
    // Your handler logic here
    const data = { message: 'Hello World' }
    return NextResponse.json(data)
  })
}

/**
 * Example 2: API route with authentication and audit logging
 */
export async function POST(request: NextRequest) {
  return withAudit(request, async (req) => {
    // Require authentication
    const user = await requireRoleAPI('staff')

    // Your handler logic
    const body = await req.json()
    const result = await processData(body, user.id)

    return NextResponse.json({ success: true, data: result })
  })
}

/**
 * Example 3: API route with role requirement and audit logging
 */
export async function DELETE(request: NextRequest) {
  return withAudit(request, async (req) => {
    // Require admin role
    const user = await requireRoleAPI(UserRole.ADMIN)

    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      )
    }

    await deleteResource(id, user.id)

    return NextResponse.json({ success: true })
  })
}

/**
 * Example 4: API route with error handling and audit logging
 */
export async function PUT(request: NextRequest) {
  return withAudit(request, async (req) => {
    try {
      const user = await requireRoleAPI('verifier')
      const body = await req.json()

      // Validate input
      if (!body.propertyId) {
        return NextResponse.json(
          { error: 'propertyId is required' },
          { status: 400 }
        )
      }

      // Process request
      const result = await updateProperty(body.propertyId, body, user.id)

      return NextResponse.json({ success: true, data: result })
    } catch (error) {
      // Error is automatically logged by audit middleware
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

// ============================================================================
// Server Action Examples
// ============================================================================

/**
 * Example 5: Server action with audit logging
 */
'use server'

import { requireRole, UserRole } from '@/lib/auth'
import { headers } from 'next/headers'

export async function uploadDocument(formData: FormData) {
  // Require authentication
  const user = await requireRole(UserRole.STAFF)

  // Get headers for IP/user agent extraction
  const headersList = await headers()

  // Log the server action
  await logServerAction(
    'uploadDocument',
    user.id,
    {
      property_id: formData.get('propertyId') as string,
      doc_number: formData.get('docNumber') as string,
    },
    {
      headers: Object.fromEntries(headersList.entries()),
    }
  )

  // Your action logic here
  const result = await processDocumentUpload(formData, user.id)

  return { success: true, data: result }
}

/**
 * Example 6: Server action with detailed audit logging
 */
'use server'

export async function verifyDocument(documentId: string, status: 'verified' | 'rejected', reason?: string) {
  const user = await requireRole(UserRole.VERIFIER)
  const headersList = await headers()

  // Log before processing
  await logServerAction(
    'verifyDocument',
    user.id,
    {
      document_id: documentId,
      status,
      reason,
      verifier_id: user.id,
    },
    {
      headers: Object.fromEntries(headersList.entries()),
    }
  )

  // Process verification
  const result = await processVerification(documentId, status, reason, user.id)

  return { success: true, data: result }
}

// ============================================================================
// Helper Functions (Placeholders)
// ============================================================================

async function processData(data: unknown, userId: string) {
  // Implementation
  return { processed: true }
}

async function deleteResource(id: string, userId: string) {
  // Implementation
}

async function updateProperty(propertyId: string, data: unknown, userId: string) {
  // Implementation
  return { updated: true }
}

async function processDocumentUpload(formData: FormData, userId: string) {
  // Implementation
  return { uploaded: true }
}

async function processVerification(
  documentId: string,
  status: 'verified' | 'rejected',
  reason: string | undefined,
  userId: string
) {
  // Implementation
  return { verified: true }
}
