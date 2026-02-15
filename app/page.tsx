/**
 * VER System Landing Page
 *
 * Landing page for the Records Encryption & Verification (VER) system
 * for property deeds management and verification.
 * Task 11: Role-aware dashboard link, property map (public), appropriate links for authenticated users.
 */

import Link from 'next/link'
import { getAuthenticatedUser } from '@/lib/auth/session'
import type { UserRoleType } from '@/lib/auth/types'

const ROLE_DASHBOARDS: Record<UserRoleType, string> = {
  staff: '/dashboard/staff',
  verifier: '/dashboard/verifier',
  chief_registrar: '/dashboard/chief-registrar',
  admin: '/dashboard/admin',
}

export default async function Home() {
  const user = await getAuthenticatedUser()
  const dashboardHref = user?.profile?.role
    ? ROLE_DASHBOARDS[user.profile.role] ?? '/dashboard/staff'
    : '/dashboard/staff'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700">
                VER
              </Link>
              <span className="ml-2 text-sm text-gray-600 hidden sm:inline">
                Records Encryption & Verification
              </span>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Property Management: public access for everyone */}
              <Link
                href="/properties/management"
                className="px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
              >
                Property Management
              </Link>
              {user ? (
                <>
                  <Link
                    href="/upload"
                    className="px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium hidden sm:block"
                  >
                    Upload
                  </Link>
                  <Link
                    href="/documents"
                    className="px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium hidden sm:block"
                  >
                    Documents
                  </Link>
                  <Link
                    href="/verify"
                    className="px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium hidden sm:block"
                  >
                    Verify
                  </Link>
                  <Link
                    href="/admin/audit-logs"
                    className="px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium hidden md:block"
                  >
                    Audit
                  </Link>
                  <span className="text-sm text-gray-600 truncate max-w-[140px] sm:max-w-none">
                    Welcome, {user.email}
                  </span>
                  <Link
                    href={dashboardHref}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Go to Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-3 py-2 text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/login"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Secure Property Deed
            <br />
            <span className="text-blue-600">Verification System</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Protect land deed and property records with cryptographic verification,
            tamper detection, and comprehensive audit trails. Built for staff, verifiers,
            and registrars to ensure document integrity and legal compliance.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            {user ? (
              <>
                <Link
                  href={dashboardHref}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg"
                >
                  Go to Dashboard
                </Link>
                <Link
                  href="/properties/management"
                  className="px-8 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold text-lg"
                >
                  Property Management
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg"
                >
                  Sign In to Dashboard
                </Link>
                <Link
                  href="/properties/management"
                  className="px-8 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold text-lg"
                >
                  Property Management
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Cryptographic Verification</h3>
            <p className="text-gray-600">
              SHA-256 hashing ensures document integrity. Any tampering is immediately
              detectable through hash comparison.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Comprehensive Audit Trail</h3>
            <p className="text-gray-600">
              Every action is logged with timestamps, user identity, and details.
              Immutable audit logs support legal admissibility.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Role-Based Access Control</h3>
            <p className="text-gray-600">
              Secure separation of duties with staff, verifier, chief registrar,
              and admin roles. Each role has appropriate permissions.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">GIS Integration</h3>
            <p className="text-gray-600">
              Interactive maps with property locations, status overlays, and
              spatial analytics for identifying trends and fraud hotspots.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Advanced Reporting</h3>
            <p className="text-gray-600">
              Generate comprehensive reports in CSV and PDF formats. Scheduled
              reports with email delivery for compliance and oversight.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-Time Updates</h3>
            <p className="text-gray-600">
              Live notifications and real-time document status updates.
              Stay informed about verification progress and system events.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-24 bg-white rounded-2xl shadow-xl p-12 border border-gray-200">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <Link
              href="/upload"
              className="text-center block p-4 rounded-xl hover:bg-blue-50 transition-colors group"
            >
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 group-hover:bg-blue-700 transition-colors">
                1
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload</h3>
              <p className="text-gray-600 text-sm">
                Staff uploads property deed documents (PDF, DOC, DOCX) and associates them with properties.
              </p>
            </Link>
            <Link
              href="/documents"
              className="text-center block p-4 rounded-xl hover:bg-blue-50 transition-colors group"
            >
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 group-hover:bg-blue-700 transition-colors">
                2
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Hash</h3>
              <p className="text-gray-600 text-sm">
                System computes SHA-256 hash of the document and stores it as a cryptographic fingerprint.
              </p>
            </Link>
            <Link
              href="/verify"
              className="text-center block p-4 rounded-xl hover:bg-blue-50 transition-colors group"
            >
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 group-hover:bg-blue-700 transition-colors">
                3
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Verify</h3>
              <p className="text-gray-600 text-sm">
                Verifier uploads comparison document. System recomputes hash and compares to stored hash.
              </p>
            </Link>
            <Link
              href="/admin/audit-logs"
              className="text-center block p-4 rounded-xl hover:bg-blue-50 transition-colors group"
            >
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 group-hover:bg-blue-700 transition-colors">
                4
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Audit</h3>
              <p className="text-gray-600 text-sm">
                All actions are logged with timestamps and user identity for legal compliance and oversight.
              </p>
            </Link>
          </div>
        </div>

        {/* CTA Section */}
        {!user && (
          <div className="mt-24 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-xl p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl mb-8 text-blue-100">
              Sign in to access your dashboard and start managing property deeds securely.
            </p>
            <Link
              href="/login"
              className="inline-block px-8 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold text-lg"
            >
              Sign In Now
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-24 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="mb-4 md:mb-0">
              <h3 className="text-xl font-bold text-blue-600">VER System</h3>
              <p className="text-sm text-gray-600">Records Encryption & Verification</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <Link
                href="/properties/management"
                className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
              >
                Property Management
              </Link>
              {!user && (
                <Link
                  href="/login"
                  className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
                >
                  Sign In
                </Link>
              )}
              <p className="text-gray-600">© {new Date().getFullYear()} VER System. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
