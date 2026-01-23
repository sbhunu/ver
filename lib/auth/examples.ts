/**
 * Usage Examples for requireRole Helper Functions
 * 
 * This file demonstrates how to use the requireRole functions in:
 * - Server Actions
 * - API Route Handlers
 */

// ============================================================================
// Server Actions Examples
// ============================================================================

/**
 * Example: Server Action with role requirement
 */
export async function exampleServerAction() {
  'use server'
  
  // Import the helper
  const { requireRole, UserRole } = await import('./require-role')
  
  // Require admin role
  const user = await requireRole(UserRole.ADMIN)
  
  // User is guaranteed to be admin or higher
  // Proceed with admin-only logic
  return { success: true, message: `Admin ${user.email} performed action` }
}

/**
 * Example: Using role-specific wrappers in Server Actions
 */
export async function exampleWithWrapper() {
  'use server'
  
  const { isAdmin } = await import('./require-role')
  
  // isAdmin() is equivalent to requireRole(UserRole.ADMIN)
  const user = await isAdmin()
  
  return { success: true, userId: user.id }
}

// ============================================================================
// API Route Handler Examples
// ============================================================================

/**
 * Example: API Route with role requirement
 */
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { requireRoleAPI, handleAuthError, UserRole } = await import('./require-role')
  
  try {
    const user = await requireRoleAPI(UserRole.VERIFIER)
    
    // User is guaranteed to be verifier or higher
    return NextResponse.json({ 
      data: 'Verifier-only data',
      userId: user.id 
    })
  } catch (error) {
    return handleAuthError(error)
  }
}

/**
 * Example: Using withAuth wrapper for cleaner API routes
 */
export async function POST(request: Request) {
  const { withAuth, UserRole } = await import('./api-helpers')
  
  return withAuth(request, UserRole.ADMIN, async (user) => {
    // Your API logic here
    const body = await request.json()
    
    return NextResponse.json({
      success: true,
      message: `Admin ${user.email} created resource`,
      data: body,
    })
  })
}

/**
 * Example: Using role-specific API wrappers
 */
export async function PUT(request: Request) {
  const { isAdminAPI, handleAuthError } = await import('./require-role')
  
  try {
    const user = await isAdminAPI()
    
    // User is guaranteed to be admin
    return NextResponse.json({ success: true, userId: user.id })
  } catch (error) {
    return handleAuthError(error)
  }
}

/**
 * Example: API route for any authenticated user
 */
export async function DELETE(request: Request) {
  const { withAuthAny } = await import('./api-helpers')
  
  return withAuthAny(request, async (user) => {
    // Any authenticated user can access this
    return NextResponse.json({ 
      success: true,
      message: `User ${user.email} deleted resource` 
    })
  })
}
