/**
 * User Management API Route (Single User)
 * 
 * Handles individual user operations (get, update, delete)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI } from '@/lib/auth/require-role'
import { getUserById, updateUserRole, updateUserEmail } from '@/lib/db/users'
import { handleApiError } from '@/lib/errors'
import type { UserRoleType } from '@/lib/auth/types'

/**
 * GET /api/admin/users/[id]
 * 
 * Get user by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRoleAPI('admin')

    const { id } = await params
    const user = await getUserById(id)

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user }, { status: 200 })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * PUT /api/admin/users/[id]
 * 
 * Update user
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRoleAPI('admin')

    const { id } = await params
    const body = await request.json()
    const { email, role } = body

    // Update role if provided
    if (role) {
      const validRoles: UserRoleType[] = ['staff', 'verifier', 'chief_registrar', 'admin']
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }

      await updateUserRole(id, role)
    }

    // Update email if provided
    if (email) {
      await updateUserEmail(id, email)
    }

    // Get updated user
    const updatedUser = await getUserById(id)

    return NextResponse.json(
      {
        success: true,
        user: updatedUser,
      },
      { status: 200 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}
