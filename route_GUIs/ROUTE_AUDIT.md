# Route Audit - VER System Tasks 1-10

## Overview
This document lists all routes (pages and API endpoints) created for tasks 1-10, identifies which have UI components, and tracks navigation links.

## Pages (UI Routes)

### ✅ Created Pages with UI

| Route | Page File | Task | Status | In Navigation |
|-------|-----------|------|--------|---------------|
| `/` | `app/page.tsx` | Landing | ✅ | ❌ (Public landing) |
| `/login` | `app/login/page.tsx` | 2 | ✅ | ❌ (Auth route) |
| `/dashboard/staff` | `app/dashboard/staff/page.tsx` | 9.1 | ✅ | ✅ |
| `/dashboard/verifier` | `app/dashboard/verifier/page.tsx` | 9.2 | ✅ | ✅ |
| `/dashboard/chief-registrar` | `app/dashboard/chief-registrar/page.tsx` | 9.3 | ✅ | ✅ |
| `/dashboard/admin` | `app/dashboard/admin/page.tsx` | 9.4 | ✅ | ✅ |
| `/map` | `app/map/page.tsx` | 8.5 | ✅ | ✅ |
| `/admin/audit-logs` | `app/admin/audit-logs/page.tsx` | 6.5 | ✅ | ✅ |

### ❌ Missing Pages (Functionality Exists, UI Needed)

| Route | API/Function | Task | Status | Notes |
|-------|--------------|------|--------|-------|
| `/upload` | `app/actions/upload-document.ts` | 4.2 | ❌ | Upload UI page needed |
| `/documents` | `lib/db/documents.ts` | 4.4 | ❌ | Document list page needed |
| `/documents/[id]` | `lib/db/documents.ts` | 4.4 | ❌ | Document detail page needed |
| `/properties` | `app/api/properties/route.ts` | 8.2 | ❌ | Property list page needed |
| `/properties/[id]` | `app/api/properties/[id]/route.ts` | 8.2 | ❌ | Property detail page needed |
| `/properties/import` | `app/api/properties/import/route.ts` | 8.4 | ❌ | Property import page needed |
| `/verify` | `supabase/functions/verify-document` | 7 | ❌ | Verification UI page needed (may be in verifier dashboard) |
| `/reports` | `supabase/functions/reports` | 10.1 | ❌ | Report builder UI needed |
| `/reports/schedules` | `app/api/reports/schedules/route.ts` | 10.4 | ❌ | Report schedule management UI needed |

## API Routes Summary

### Total API Routes: 20

#### By Category:

**Document Management (Task 4) - 1 route**
- `/api/upload/multipart` (POST, PUT, DELETE) - Multipart file upload

**Properties & GIS (Task 8) - 3 routes**
- `/api/properties` (GET, POST) - Property CRUD
- `/api/properties/[id]` (GET, PUT, DELETE) - Single property operations
- `/api/properties/import` (POST) - Bulk property import

**Verifications (Task 7) - 1 route**
- `/api/verifications` (POST) - Create verification record

**Reports (Task 10) - 6 routes**
- `/api/reports/schedules` (GET, POST) - Report schedule management
- `/api/reports/schedules/[id]` (GET, PUT, DELETE) - Single schedule operations
- `/api/reports/schedules/[id]/deliveries` (GET) - Delivery history
- `/api/reports/jobs` (GET, POST) - Background report jobs
- `/api/reports/jobs/[id]` (GET) - Job status and progress
- `/api/unsubscribe` (GET, POST) - Email unsubscribe

**Admin & System (Tasks 6, 9) - 9 routes**
- `/api/admin/audit-logs` (GET) - Audit log listing
- `/api/admin/audit-logs/export` (GET) - Export audit logs
- `/api/admin/audit-logs/retention` (GET, POST, PUT) - Retention policy management
- `/api/admin/audit-logs/retention/archive` (POST) - Trigger archival
- `/api/admin/users` (GET, POST) - User management
- `/api/admin/users/[id]` (GET, PUT, DELETE) - Single user operations
- `/api/admin/users/bulk-role` (POST) - Bulk role updates
- `/api/admin/system/health` (GET) - System health metrics
- `/api/admin/system/retention-policies/[id]` (PUT) - Update retention policy

## Edge Functions Summary

### Total Edge Functions: 6

**Document Processing (Tasks 5, 7)**
- `hash-document` - Compute SHA-256 hashes for uploaded documents
- `verify-document` - Verify documents by comparing hashes

**GIS & Spatial (Task 8)**
- `gis-layers` - Serve GeoJSON FeatureCollections for mapping

**Reporting (Task 10)**
- `reports` - Generate reports (JSON, CSV, PDF)
- `scheduled-reports` - Process scheduled reports and send emails
- `process-report-jobs` - Process background report generation jobs

## Navigation Issues

### Missing from Navigation:
1. ❌ `/upload` - Document upload page (Task 4.2)
2. ❌ `/documents` - Document list page (Task 4.4)
3. ❌ `/properties` - Property list page (Task 8.2)
4. ❌ `/properties/import` - Property import page (Task 8.4)
5. ❌ `/reports` - Report builder page (Task 10.1)
6. ❌ `/reports/schedules` - Report schedule management (Task 10.4)

### Navigation Structure Needed:
- Dashboard (role-based)
  - Staff Dashboard
  - Verifier Dashboard
  - Chief Registrar Dashboard
  - Admin Dashboard
- Map
- Documents
  - Upload
  - List
- Properties
  - List
  - Import
- Reports
  - Builder
  - Schedules
- Audit Logs
- Admin (admin/chief_registrar only)

## Server Actions

### Created Server Actions:
- `app/actions/upload-document.ts` - Document upload (Task 4.2)

## Database Operations

### Created Database Modules:
- `lib/db/documents.ts` - Document CRUD operations
- `lib/db/document-hashes.ts` - Hash management
- `lib/db/properties.ts` - Property CRUD with spatial support
- `lib/db/properties-import.ts` - Bulk property import
- `lib/db/verifications.ts` - Verification records
- `lib/db/audit-logs.ts` - Audit log queries
- `lib/db/users.ts` - User management
- `lib/db/system-config.ts` - System configuration
- `lib/db/analytics.ts` - Analytics queries
- `lib/db/report-schedules.ts` - Report scheduling
- `lib/db/email-preferences.ts` - Email preferences
- `lib/db/report-jobs.ts` - Report job management

## Summary Statistics

- **Pages Created:** 8
- **Pages with Navigation:** 6 (75%)
- **Pages Missing Navigation:** 2 (25%)
- **Pages Needing UI:** 9
- **API Routes Created:** 20
- **Edge Functions Created:** 6
- **Server Actions Created:** 1
- **Database Modules Created:** 12
