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

interface MenuItem {
  label: string
  href: string
  roles: UserRoleType[]
  icon?: string
}

const menuItems: MenuItem[] = [
  {
    label: 'Staff Dashboard',
    href: '/dashboard/staff',
    roles: ['staff'],
    icon: '📄',
  },
  {
    label: 'Verifier Dashboard',
    href: '/dashboard/verifier',
    roles: ['verifier'],
    icon: '✅',
  },
  {
    label: 'Chief Registrar Dashboard',
    href: '/dashboard/chief-registrar',
    roles: ['chief_registrar'],
    icon: '📊',
  },
  {
    label: 'Admin Dashboard',
    href: '/dashboard/admin',
    roles: ['admin'],
    icon: '⚙️',
  },
  {
    label: 'Documents',
    href: '/documents',
    roles: ['staff', 'verifier', 'chief_registrar', 'admin'],
    icon: '📄',
  },
  {
    label: 'Upload Document',
    href: '/upload',
    roles: ['staff', 'verifier'],
    icon: '📤',
  },
  {
    label: 'Properties',
    href: '/properties',
    roles: ['staff', 'verifier', 'chief_registrar', 'admin'],
    icon: '🏢',
  },
  {
    label: 'Property Import',
    href: '/properties/import',
    roles: ['admin', 'chief_registrar'],
    icon: '📥',
  },
  {
    label: 'Map',
    href: '/map',
    roles: ['staff', 'verifier', 'chief_registrar', 'admin'],
    icon: '🗺️',
  },
  {
    label: 'Reports',
    href: '/reports',
    roles: ['chief_registrar', 'admin'],
    icon: '📈',
  },
  {
    label: 'Report Schedules',
    href: '/reports/schedules',
    roles: ['admin'],
    icon: '⏰',
  },
  {
    label: 'Audit Logs',
    href: '/admin/audit-logs',
    roles: ['chief_registrar', 'admin'],
    icon: '📋',
  },
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

  // Filter menu items based on user role
  const visibleMenuItems = menuItems.filter((item) => {
    if (!user) return false
    return item.roles.includes(user.role)
  })

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
                {visibleMenuItems.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        {item.icon && <span className="mr-3">{item.icon}</span>}
                        {item.label}
                      </Link>
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
