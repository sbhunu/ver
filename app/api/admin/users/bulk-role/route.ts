/**
 * Bulk User Role Update API Route
 * 
 * Handles bulk user role updates
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI } from '@/lib/auth/require-role'
import { bulkUpdateUserRoles } from '@/lib/db/users'
import { handleApiError } from '@/lib/errors'
import type { UserRoleType } from '@/lib/auth/types'

/**
 * POST /api/admin/users/bulk-role
 * 
 * Bulk update user roles
 */
export async function POST(request: NextRequest) {
  try {
    await requireRoleAPI('admin')

    const body = await request.json()
    const { userIds, role } = body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds array is required' },
        { status: 400 }
      )
    }

    if (!role) {
      return NextResponse.json(
        { error: 'role is required' },
        { status: 400 }
      )
    }

    const validRoles: UserRoleType[] = ['staff', 'verifier', 'chief_registrar', 'admin']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    const result = await bulkUpdateUserRoles(userIds, role)

    return NextResponse.json(
      {
        success: true,
        result,
      },
      { status: 200 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}
