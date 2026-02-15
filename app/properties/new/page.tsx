/**
 * Add Property Page
 *
 * Form to add a single property with address, owner, and optional geometry.
 */

import { requireRole } from '@/lib/auth/require-role'
import { PropertyAddForm } from '@/components/properties/PropertyAddForm'
import VerTopNav from '@/components/layout/VerTopNav'

export default async function AddPropertyPage() {
  await requireRole('staff', '/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <VerTopNav />
      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Add Property</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Add a new property with address, owner, and optional geometry (WKT or GeoJSON).
            </p>
          </div>
          <PropertyAddForm />
        </div>
      </div>
    </div>
  )
}
