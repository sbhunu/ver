/**
 * Dashboard Layout
 * 
 * Shared layout for all dashboard pages with navigation, role-based menu, and responsive sidebar
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Toaster } from 'react-hot-toast'
import DashboardErrorBoundary from '@/components/dashboard/DashboardErrorBoundary'
import type { UserRoleType } from '@/lib/auth/types'

interface DashboardLayoutProps {
  children: React.ReactNode
}

const ALL_ROLES: UserRoleType[] = ['staff', 'verifier', 'chief_registrar', 'admin']

interface MenuLink {
  type: 'link'
  label: string
  href: string
  roles: UserRoleType[]
  icon?: string
}

interface MenuSubItem {
  label: string
  href: string
  roles: UserRoleType[]
}

interface MenuGroup {
  type: 'group'
  label: string
  icon?: string
  /** Parent visible to these roles; children have their own roles. */
  roles: UserRoleType[]
  children: MenuSubItem[]
}

type MenuEntry = MenuLink | MenuGroup

const menuEntries: MenuEntry[] = [
  { type: 'link', label: 'Staff Dashboard', href: '/dashboard/staff', roles: ['staff'], icon: '📄' },
  { type: 'link', label: 'Verifier Dashboard', href: '/dashboard/verifier', roles: ['verifier'], icon: '✅' },
  { type: 'link', label: 'Verify', href: '/verify', roles: ['verifier', 'chief_registrar', 'admin'], icon: '🔍' },
  { type: 'link', label: 'Chief Registrar Dashboard', href: '/dashboard/chief-registrar', roles: ['chief_registrar'], icon: '📊' },
  { type: 'link', label: 'Admin Dashboard', href: '/dashboard/admin', roles: ['admin'], icon: '⚙️' },
  {
    type: 'group',
    label: 'Documents',
    icon: '📄',
    roles: ALL_ROLES,
    children: [
      { label: 'List', href: '/documents', roles: ALL_ROLES },
      { label: 'Upload', href: '/upload', roles: ['staff', 'verifier'] },
    ],
  },
  {
    type: 'group',
    label: 'Properties',
    icon: '🏢',
    roles: ALL_ROLES,
    children: [
      { label: 'List', href: '/properties', roles: ALL_ROLES },
      { label: 'Import', href: '/properties/import', roles: ['admin', 'chief_registrar'] },
    ],
  },
  { type: 'link', label: 'Map', href: '/map', roles: ALL_ROLES, icon: '🗺️' },
  {
    type: 'group',
    label: 'Reports',
    icon: '📈',
    roles: ['chief_registrar', 'admin'],
    children: [
      { label: 'Builder', href: '/reports', roles: ['chief_registrar', 'admin'] },
      { label: 'Schedules', href: '/reports/schedules', roles: ['admin'] },
    ],
  },
  { type: 'link', label: 'Audit Logs', href: '/admin/audit-logs', roles: ['chief_registrar', 'admin'], icon: '📋' },
]

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<{ id: string; email: string; role: UserRoleType } | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (authUser) {
          const { data: profile } = await supabase
            .from('ver_profiles')
            .select('id, email, role')
            .eq('id', authUser.id)
            .single()

          if (profile) {
            setUser({
              id: profile.id,
              email: profile.email,
              role: profile.role,
            })
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [supabase])

  const hasRole = (roles: UserRoleType[]) => user != null && roles.includes(user.role)

  const visibleSubItems = (children: MenuSubItem[]) =>
    children.filter((c) => hasRole(c.roles))

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <DashboardErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Logo/Header */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
              <h1 className="text-xl font-bold text-gray-900">VER Dashboard</h1>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 overflow-y-auto">
              <ul className="space-y-1">
                {menuEntries.map((entry, idx) => {
                  if (entry.type === 'link') {
                    if (!hasRole(entry.roles)) return null
                    const isActive = pathname === entry.href || pathname?.startsWith(entry.href + '/')
                    return (
                      <li key={entry.href}>
                        <Link
                          href={entry.href}
                          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                          }`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          {entry.icon && <span className="mr-3">{entry.icon}</span>}
                          {entry.label}
                        </Link>
                      </li>
                    )
                  }
                  const group = entry
                  if (!hasRole(group.roles)) return null
                  const subs = visibleSubItems(group.children)
                  if (subs.length === 0) return null
                  const matchingSub = subs.filter(
                    (s) => pathname === s.href || pathname?.startsWith(s.href + '/')
                  )
                  const activeSubHref =
                    matchingSub.length > 0
                      ? matchingSub.reduce((a, b) => (a.href.length >= b.href.length ? a : b)).href
                      : null
                  return (
                    <li key={`group-${idx}-${group.label}`}>
                      <div className="flex items-center px-4 py-2 text-sm font-medium text-gray-500 uppercase tracking-wider">
                        {group.icon && <span className="mr-3">{group.icon}</span>}
                        {group.label}
                      </div>
                      <ul className="mt-1 ml-4 space-y-0.5 border-l border-gray-200 pl-3">
                        {subs.map((sub) => {
                          const isActive = sub.href === activeSubHref
                          return (
                            <li key={sub.href}>
                              <Link
                                href={sub.href}
                                className={`block py-1.5 pl-1 text-sm transition-colors ${
                                  isActive ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'
                                }`}
                                onClick={() => setSidebarOpen(false)}
                              >
                                {sub.label}
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    </li>
                  )
                })}
              </ul>
            </nav>

            {/* User section */}
            <div className="px-4 py-4 border-t border-gray-200">
              {user && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-900">{user.email}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Sign Out
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="lg:pl-64">
          {/* Top bar */}
          <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                ☰
              </button>
              <div className="flex-1" />
              {user && (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">{user.email}</span>
                </div>
              )}
            </div>
          </header>

          {/* Page content */}
          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#333',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </DashboardErrorBoundary>
  )
}
