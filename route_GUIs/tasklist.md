# Route GUI Implementation Tasklist

## Overview
This tasklist identifies discrepancies between the implemented functionality and the required UI pages and navigation links based on tasks 1-10.

**Date Created:** Current  
**Total Missing Pages:** 9  
**Total Navigation Updates:** 6  
**Priority:** High

---

## 🔴 High Priority Tasks

### 1. Create Document Upload Page (`/upload`)
- **Task Reference:** 4.2, 4.3
- **Status:** ❌ Missing
- **Existing Functionality:**
  - `app/actions/upload-document.ts` - Server Action for upload
  - `app/api/upload/multipart/route.ts` - Multipart upload API
  - `lib/hooks/useUploadProgress.ts` - Upload progress hook
  - `components/upload/UploadProgress.tsx` - Progress component
- **Required:**
  - Create `app/upload/page.tsx`
  - Integrate upload form with property selection
  - Use `useUploadProgress` hook for progress tracking
  - Add file validation UI
  - Display upload success/error states
- **Navigation:** Add to sidebar for staff and verifier roles

### 2. Create Document List Page (`/documents`)
- **Task Reference:** 4.4
- **Status:** ❌ Missing
- **Existing Functionality:**
  - `lib/db/documents.ts` - Document CRUD operations
  - `lib/hooks/useRealtimeDocuments.ts` - Real-time document updates
- **Required:**
  - Create `app/documents/page.tsx`
  - Display document list with filtering (status, property, date range)
  - Show document status badges
  - Link to document detail pages
  - Integrate real-time updates
- **Navigation:** Add to sidebar for all roles

### 3. Create Document Detail Page (`/documents/[id]`)
- **Task Reference:** 4.4, 4.5
- **Status:** ❌ Missing
- **Existing Functionality:**
  - `lib/db/documents.ts` - Get document by ID
  - `lib/db/document-hashes.ts` - Hash history
  - `lib/db/verifications.ts` - Verification records
- **Required:**
  - Create `app/documents/[id]/page.tsx`
  - Display document metadata
  - Show hash history
  - Display verification history
  - Link to download document
  - Show document status and timeline
- **Navigation:** Accessible via document list

### 4. Create Property List Page (`/properties`)
- **Task Reference:** 8.2
- **Status:** ❌ Missing
- **Existing Functionality:**
  - `app/api/properties/route.ts` - Property CRUD API
  - `lib/db/properties.ts` - Property database operations
  - Spatial query support (ST_Contains, ST_Intersects, etc.)
- **Required:**
  - Create `app/properties/page.tsx`
  - Display property list with pagination
  - Add filtering (status, date range, spatial bounds)
  - Show property status badges
  - Link to property detail pages
  - Add map view toggle
- **Navigation:** Add to sidebar for all roles

### 5. Create Property Detail Page (`/properties/[id]`)
- **Task Reference:** 8.2
- **Status:** ❌ Missing
- **Existing Functionality:**
  - `app/api/properties/[id]/route.ts` - Single property API
  - `lib/db/properties.ts` - Get property by ID
  - GIS integration with PostGIS
- **Required:**
  - Create `app/properties/[id]/page.tsx`
  - Display property details (owner, area, registration date, etc.)
  - Show property geometry on map
  - Display associated documents
  - Show property status and metadata
  - Add edit functionality (admin/chief_registrar only)
- **Navigation:** Accessible via property list

### 6. Create Report Builder Page (`/reports`)
- **Task Reference:** 10.1, 10.2, 10.3
- **Status:** ❌ Missing
- **Existing Functionality:**
  - `supabase/functions/reports` - Report generation Edge Function
  - Supports JSON, CSV, PDF formats
  - Report types: audit logs, verification reports, property listings
- **Required:**
  - Create `app/reports/page.tsx`
  - Report type selection (audit logs, verifications, properties)
  - Filter configuration UI (date range, status, etc.)
  - Format selection (JSON, CSV, PDF)
  - Generate and download reports
  - Show report generation progress
- **Navigation:** Add to sidebar for chief_registrar and admin roles

---

## 🟡 Medium Priority Tasks

### 7. Create Property Import Page (`/properties/import`)
- **Task Reference:** 8.4
- **Status:** ❌ Missing
- **Existing Functionality:**
  - `app/api/properties/import/route.ts` - Bulk import API
  - `lib/db/properties-import.ts` - Import database operations
  - `lib/utils/property-import.ts` - Import utilities
  - Supports CSV/JSON with WKT/GeoJSON geometry
- **Required:**
  - Create `app/properties/import/page.tsx`
  - File upload interface (CSV/JSON)
  - Import progress tracking
  - Validation error display
  - Duplicate detection results
  - Import history
- **Navigation:** Add to sidebar for admin and chief_registrar roles

### 8. Create Report Schedule Management Page (`/reports/schedules`)
- **Task Reference:** 10.4
- **Status:** ❌ Missing
- **Existing Functionality:**
  - `app/api/reports/schedules/route.ts` - Schedule CRUD API
  - `lib/db/report-schedules.ts` - Schedule database operations
  - Email delivery support
- **Required:**
  - Create `app/reports/schedules/page.tsx`
  - Display schedule list
  - Create/edit schedule form
  - Frequency configuration (daily, weekly, monthly)
  - Email recipient management
  - Delivery history
  - Enable/disable schedules
- **Navigation:** Add to sidebar for admin role

### 9. Create/Enhance Verification Page (`/verify`)
- **Task Reference:** 7.2, 7.3
- **Status:** ⚠️ Partially exists in verifier dashboard
- **Existing Functionality:**
  - `supabase/functions/verify-document` - Verification Edge Function
  - `app/api/verifications/route.ts` - Verification API
  - `components/dashboard/VerificationTools.tsx` - Verification tools component
- **Required:**
  - Option A: Enhance verifier dashboard with better verification UI
  - Option B: Create dedicated `app/verify/page.tsx`
  - Document selection interface
  - File upload for comparison
  - Hash comparison results display
  - Verification decision form
  - Batch verification support
- **Navigation:** May be integrated into verifier dashboard

---

## 🔵 Navigation Updates Required

### 10. Update Dashboard Layout Navigation
- **File:** `app/dashboard/layout.tsx`
- **Status:** ⚠️ Needs updates
- **Required Changes:**
  1. Add "Documents" menu item (all roles)
     - Sub-items: "Upload", "List"
  2. Add "Properties" menu item (all roles)
     - Sub-items: "List", "Import" (admin/chief_registrar only)
  3. Add "Reports" menu item (chief_registrar/admin roles)
     - Sub-items: "Builder", "Schedules" (admin only)
  4. Update menu structure to support nested items
  5. Ensure role-based visibility

### 11. Add Navigation Links in Landing Page
- **File:** `app/page.tsx`
- **Status:** ⚠️ Needs updates
- **Required Changes:**
  - Update "Go to Dashboard" link to be role-aware
  - Add link to property map for public access
  - Ensure authenticated users see appropriate links

---

## 📋 Implementation Checklist

### Phase 1: High Priority Pages (6 pages)
- [ ] Task 1: Create `/upload` page
- [ ] Task 2: Create `/documents` page
- [ ] Task 3: Create `/documents/[id]` page
- [ ] Task 4: Create `/properties` page
- [ ] Task 5: Create `/properties/[id]` page
- [ ] Task 6: Create `/reports` page

### Phase 2: Medium Priority Pages (3 pages)
- [ ] Task 7: Create `/properties/import` page
- [ ] Task 8: Create `/reports/schedules` page
- [ ] Task 9: Enhance verification UI (or create `/verify` page)

### Phase 3: Navigation Updates (2 updates)
- [ ] Task 10: Update dashboard layout navigation
- [ ] Task 11: Update landing page links

### Phase 4: Testing & Validation
- [ ] Test all new pages with different user roles
- [ ] Verify navigation links work correctly
- [ ] Test API integration for all pages
- [ ] Validate real-time updates work
- [ ] Test responsive design on mobile devices
- [ ] Verify error handling and loading states

---

## 🎯 Success Criteria

1. ✅ All 9 missing pages are created and functional
2. ✅ All pages are accessible through navigation
3. ✅ Navigation is role-aware and shows appropriate items
4. ✅ All pages integrate with existing APIs/Edge Functions
5. ✅ Real-time updates work where applicable
6. ✅ Error handling and loading states are implemented
7. ✅ Responsive design works on all devices
8. ✅ All links in navigation are tested and working

---

## 📊 Progress Tracking

**Total Tasks:** 11  
**High Priority:** 6  
**Medium Priority:** 3  
**Navigation Updates:** 2  
**Completed:** 0  
**In Progress:** 0  
**Pending:** 11

---

## 🔗 Related Files

### Pages to Create:
- `app/upload/page.tsx`
- `app/documents/page.tsx`
- `app/documents/[id]/page.tsx`
- `app/properties/page.tsx`
- `app/properties/[id]/page.tsx`
- `app/properties/import/page.tsx`
- `app/reports/page.tsx`
- `app/reports/schedules/page.tsx`
- `app/verify/page.tsx` (optional, may enhance dashboard instead)

### Files to Update:
- `app/dashboard/layout.tsx` - Navigation menu
- `app/page.tsx` - Landing page links

### Existing Components to Reuse:
- `components/upload/UploadProgress.tsx`
- `components/dashboard/StatusBadge.tsx`
- `components/dashboard/ProgressIndicator.tsx`
- `components/dashboard/VerificationTools.tsx`
- `components/map/PropertyMap.tsx`

### Existing Hooks to Use:
- `lib/hooks/useUploadProgress.ts`
- `lib/hooks/useRealtimeDocuments.ts`
- `lib/hooks/useRealtimeNotifications.ts`
