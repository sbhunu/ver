/**
 * User Management API Route
 * 
 * Handles user management operations (list, create)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI } from '@/lib/auth/require-role'
import { getAllUsers } from '@/lib/db/users'
import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errors'
import type { UserRoleType } from '@/lib/auth/types'

/**
 * GET /api/admin/users
 * 
 * Get all users
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin role
    await requireRoleAPI('admin')

    const users = await getAllUsers()

    return NextResponse.json({ users }, { status: 200 })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/admin/users
 * 
 * Create a new user
 */
export async function POST(request: NextRequest) {
  try {
    // Require admin role
    await requireRoleAPI('admin')

    const body = await request.json()
    const { email, role } = body

    if (!email || !role) {
      return NextResponse.json(
        { error: 'email and role are required' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles: UserRoleType[] = ['staff', 'verifier', 'chief_registrar', 'admin']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Create user in Supabase Auth
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: crypto.randomUUID(), // Generate random password - user will need to reset
      email_confirm: true,
      user_metadata: {
        role,
      },
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create user' },
        { status: 500 }
      )
    }

    // Profile should be created automatically by trigger, but verify
    const { data: profile, error: profileError } = await supabase
      .from('ver_profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      // If profile doesn't exist, create it
      const { error: createError } = await supabase
        .from('ver_profiles')
        .insert({
          id: authData.user.id,
          email,
          role,
        })

      if (createError) {
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      {
        success: true,
        user: profile || { id: authData.user.id, email, role },
        message: 'User created successfully. Password reset required.',
      },
      { status: 201 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}
