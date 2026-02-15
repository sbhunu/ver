# VER GUI & Route Audit - Tasks 1-10

## Overview
This document lists all routes (pages and API endpoints) in the VER (Records Encryption & Verification) property deeds system, maps them to Tasks 1-10, identifies which have UI components, and tracks navigation links.

**Project:** VER - Property Deeds Records Integrity  
**Tasks Covered:** 1-10  
**Date:** 2025-01-24  
**Reference:** `docs/prd.txt`, `tasks/`, `route_GUIs/tasklist.md`

---

## Pages (UI Routes)

### ✅ Created Pages with UI

| Route | Page File | Task | Status | In Navigation |
|-------|-----------|------|--------|---------------|
| `/` | `app/page.tsx` | — | ✅ | N/A (Public landing) |
| `/login` | `app/login/page.tsx` | 2 | ✅ | N/A (Auth redirect) |
| `/upload` | `app/upload/page.tsx` | 4 | ✅ | ✅ (Documents → Upload, staff/verifier) |
| `/documents` | `app/documents/page.tsx` | 4 | ✅ | ✅ (Documents → List) |
| `/documents/[id]` | `app/documents/[id]/page.tsx` | 4 | ✅ | ✅ (via Document list) |
| `/properties` | `app/properties/page.tsx` | 8 | ✅ | ✅ (Properties → List) |
| `/properties/[id]` | `app/properties/[id]/page.tsx` | 8 | ✅ | ✅ (via Property list) |
| `/properties/[id]/edit` | `app/properties/[id]/edit/page.tsx` | 8 | ✅ | ✅ (via Property detail, admin/chief_registrar) |
| `/properties/import` | `app/properties/import/page.tsx` | 8 | ✅ | ✅ (Properties → Import, admin/chief_registrar) |
| `/map` | `app/map/page.tsx` | 8 | ✅ | ✅ (Sidebar Map) |
| `/verify` | `app/verify/page.tsx` | 7 | ✅ | ✅ (Verify, verifier/chief_registrar/admin) |
| `/reports` | `app/reports/page.tsx` | 10 | ✅ | ✅ (Reports → Builder, chief_registrar/admin) |
| `/reports/schedules` | `app/reports/schedules/page.tsx` | 10 | ✅ | ✅ (Reports → Schedules, admin) |
| `/dashboard/staff` | `app/dashboard/staff/page.tsx` | 9 | ✅ | ✅ (Staff Dashboard) |
| `/dashboard/verifier` | `app/dashboard/verifier/page.tsx` | 9 | ✅ | ✅ (Verifier Dashboard) |
| `/dashboard/chief-registrar` | `app/dashboard/chief-registrar/page.tsx` | 9 | ✅ | ✅ (Chief Registrar Dashboard) |
| `/dashboard/admin` | `app/dashboard/admin/page.tsx` | 9 | ✅ | ✅ (Admin Dashboard) |
| `/admin/audit-logs` | `app/admin/audit-logs/page.tsx` | 6 | ✅ | ✅ (Audit Logs, chief_registrar/admin) |

### ❌ Missing Pages (API/Function exists but no dedicated UI)

| Route | API / Function | Task | Status | Notes |
|-------|----------------|------|--------|-------|
| `/unauthorized` | — | 2 | ❌ | No dedicated 403/unauthorized error page; middleware redirects to login |
| `/admin/users` | `GET/POST /api/admin/users`, `UserManagement` in dashboard | 9 | ⚠️ | User management embedded in `/dashboard/admin`; no standalone page |
| `/admin/roles` | `POST /api/admin/users/bulk-role` | 9 | ⚠️ | Role assignment via bulk-role; no role CRUD / permission management UI |
| `/profile` or `/settings` | — | — | ❌ | No user profile or settings page (not in PRD) |

---

## API Routes Summary

### Total API Routes: ~30 (23 route files, some with multiple methods)

#### Documents (Task 4)
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/upload/multipart` | Multipart upload (init, chunk, complete, abort) |
| GET | `/api/documents/[id]/download` | Signed download URL for document |

#### Properties (Task 8)
| Method | Route | Purpose |
|--------|-------|---------|
| GET, POST | `/api/properties` | List/create properties |
| GET, PUT, DELETE | `/api/properties/[id]` | Property CRUD |
| POST | `/api/properties/import` | Bulk property import |

#### Verifications (Task 7)
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/verifications` | Manual verification decision |
| POST | `/api/verifications/verify-with-file` | File upload → verify-document Edge Function |

#### Reports (Task 10)
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/reports/generate` | Proxy to reports Edge Function |
| GET, POST | `/api/reports/jobs` | Report job list/create |
| GET | `/api/reports/jobs/[id]` | Report job status |
| GET, POST | `/api/reports/schedules` | Schedule CRUD |
| GET, PUT, DELETE | `/api/reports/schedules/[id]` | Single schedule |
| GET | `/api/reports/schedules/[id]/deliveries` | Delivery history |

#### Admin / Audit (Tasks 6, 9)
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/admin/audit-logs` | List audit logs |
| GET | `/api/admin/audit-logs/export` | Export audit logs |
| GET, POST, PUT | `/api/admin/audit-logs/retention` | Retention policies |
| POST | `/api/admin/audit-logs/retention/archive` | Archive logs |
| GET | `/api/admin/users` | List users |
| POST | `/api/admin/users` | Create user |
| GET, PUT | `/api/admin/users/[id]` | User CRUD |
| POST | `/api/admin/users/bulk-role` | Bulk role update |
| GET | `/api/admin/system/health` | System health |
| PUT | `/api/admin/system/retention-policies/[id]` | Update retention policy |

#### Other
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/unsubscribe` | Unsubscribe from report emails |

---

## Supabase Edge Functions

| Function | Task | Purpose |
|----------|------|---------|
| `hash-document` | 5 | Compute SHA-256, persist ver_document_hashes |
| `verify-document` | 7 | Re-hash verification file, compare, write ver_verifications |
| `gis-layers` | 8 | GeoJSON FeatureCollections for map |
| `reports` | 10 | Generate CSV/PDF reports |
| `process-report-jobs` | 10 | Background report job processing |
| `scheduled-reports` | 10 | Scheduled report delivery |

---

## Embedded UI Components (No standalone page)

| Component | Location | Task | Used In |
|-----------|----------|------|---------|
| UserManagement | `components/dashboard/UserManagement.tsx` | 9 | Admin dashboard |
| SystemConfiguration | `components/dashboard/SystemConfiguration.tsx` | 9 | Admin dashboard |
| SystemHealth | `components/dashboard/SystemHealth.tsx` | 9 | Admin dashboard |
| AuditLogsViewer | `components/admin/AuditLogsViewer.tsx` | 6 | Admin dashboard, /admin/audit-logs |
| VerificationTools | `components/dashboard/VerificationTools.tsx` | 7 | Verify page, Verifier dashboard |
| PropertyMap | `components/map/PropertyMap.tsx` | 8 | Properties list, Map page |
| UploadProgress | `components/upload/UploadProgress.tsx` | 4 | Upload page |
| ReportBuilder | `components/reports/ReportBuilder.tsx` | 10 | Reports page |
| ReportSchedulesView | `components/reports/ReportSchedulesView.tsx` | 10 | Reports schedules page |

---

## Navigation Structure

### Public / Landing (`/`)
- **Property Map** → `/map` (all users)
- **Sign In** → `/login` (unauthenticated)
- **Go to Dashboard** (role-aware) → `/dashboard/staff`, `/dashboard/verifier`, etc.
- **View Property Map** → `/map`

### Dashboard Layout (authenticated)
- **Staff Dashboard** → `/dashboard/staff` (staff)
- **Verifier Dashboard** → `/dashboard/verifier` (verifier)
- **Verify** → `/verify` (verifier, chief_registrar, admin)
- **Chief Registrar Dashboard** → `/dashboard/chief-registrar` (chief_registrar)
- **Admin Dashboard** → `/dashboard/admin` (admin)
- **Documents** (group):
  - List → `/documents`
  - Upload → `/upload` (staff, verifier)
- **Properties** (group):
  - List → `/properties`
  - Import → `/properties/import` (admin, chief_registrar)
- **Map** → `/map`
- **Reports** (group, chief_registrar, admin):
  - Builder → `/reports`
  - Schedules → `/reports/schedules` (admin)
- **Audit Logs** → `/admin/audit-logs` (chief_registrar, admin)

---

## Navigation Gaps

1. **Landing → Dashboard** — Role-aware "Go to Dashboard" links implemented; no direct link to `/admin/audit-logs` from landing.
2. **Unauthorized page** — No `/unauthorized`; 403 redirects go to login.
3. **Profile / Settings** — No user profile or settings page (not in PRD).
4. **Role management** — Role assignment via UserManagement (bulk-role); no dedicated role/permission CRUD UI (PRD uses fixed roles).
