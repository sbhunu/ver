'use client'

/**
 * VER Top Navigation Bar
 *
 * Shared top navbar with Home VER and logical links for routing.
 * Use on pages that lack the main landing nav (Management, Upload, Documents, etc.)
 */

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const ROLE_DASHBOARDS: Record<string, string> = {
  staff: '/dashboard/staff',
  verifier: '/dashboard/verifier',
  chief_registrar: '/dashboard/chief-registrar',
  admin: '/dashboard/admin',
}

export interface VerTopNavProps {
  /** Optional: show Dashboard link (default: true when user is logged in) */
  showDashboard?: boolean
  /** Optional: show user email in nav (default: true when logged in) */
  showUser?: boolean
}

export default function VerTopNav({ showDashboard = true, showUser = true }: VerTopNavProps) {
  const [user, setUser] = useState<{ email: string; role: string } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (u) {
        const { data: profile } = await supabase
          .from('ver_profiles')
          .select('email, role')
          .eq('id', u.id)
          .single()
        if (profile) setUser({ email: profile.email, role: profile.role })
      }
    }
    load()
  }, [])

  const dashboardHref = user ? (ROLE_DASHBOARDS[user.role] ?? '/dashboard/staff') : '/dashboard/staff'

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2 h-14 sm:h-12">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <Link
              href="/"
              className="text-lg font-bold text-blue-600 hover:text-blue-700 whitespace-nowrap"
            >
              Home VER
            </Link>
            <span className="text-gray-300 hidden sm:inline">|</span>
            <Link
              href="/properties/management"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Property Management
            </Link>
            <Link
              href="/properties"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Properties
            </Link>
            <Link
              href="/upload"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Upload
            </Link>
            <Link
              href="/documents"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Documents
            </Link>
            <Link
              href="/verify"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Verify
            </Link>
            <Link
              href="/map"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Map
            </Link>
            {user && (user.role === 'chief_registrar' || user.role === 'admin') && (
              <Link
                href="/reports"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Reports
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            {showDashboard && (
              <Link
                href={user ? dashboardHref : '/login'}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {user ? 'Dashboard' : 'Sign In'}
              </Link>
            )}
            {showUser && user && (
              <span className="text-xs text-gray-500 truncate max-w-[120px] sm:max-w-none">
                {user.email}
              </span>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
