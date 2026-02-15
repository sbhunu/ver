# Missing GUIs, Links, and Navigations - VER Tasks 1-10

**Date:** 2025-01-24  
**Scope:** VER Property Deeds Records Integrity System  
**Reference:** See `system_audits/GUI_ROUTE_AUDIT_VER.md` for full route inventory

---

## Executive Summary

| Category | Count |
|----------|-------|
| Missing full pages | 2 |
| Missing UI components/sections | 1 |
| Missing navigation links | 2 |
| API routes without dedicated UI | 0 (all have UI) |

**Note:** The VER system has achieved high coverage. All core pages (upload, documents, properties, reports, verify, dashboards, audit logs) are implemented and in navigation. Gaps below are minor and mostly optional.

---

## 1. Missing Full Pages

### 1.1 Unauthorized / 403 Error Page (Task 2)
- **Route needed:** `/unauthorized`
- **Task:** 2.3 — Middleware route protection
- **Description:** Dedicated page for 403 Unauthorized when an authenticated user lacks the required role for a route
- **Current state:** Middleware redirects users without the required role to their role-specific dashboard (e.g. staff → `/dashboard/staff`); no dedicated error page
- **Permission:** Public (error display)
- **Priority:** Low

### 1.2 User Profile / Settings (Out of Scope)
- **Route needed:** `/profile` or `/settings`
- **Task:** Not in PRD
- **Description:** Page for users to view/edit their profile, change password, or manage preferences
- **Data source:** `ver_profiles`, Supabase Auth
- **Permission:** Authenticated users (own profile)
- **Status:** Not a gap—explicitly out of scope for current PRD; listed for future reference only

---

## 2. Missing UI Components / Sections

### 2.1 Notification Bell / Badge in Header (Out of Scope)
- **Location:** Dashboard layout, landing nav (when authenticated)
- **Task:** Not in PRD
- **Description:** Notification icon with unread count, dropdown or link to future notification center
- **Current state:** No notification UI in layouts
- **Status:** Not a gap—PRD does not define a notifications module; listed for future reference only

---

## 3. Missing Navigation Links

### 3.1 Unauthorized Page Link
- **When built:** Create `/unauthorized` page, then update middleware to redirect users without the required role to `/unauthorized` instead of their dashboard
- **Location:** `app/unauthorized/page.tsx`, `middleware.ts`

### 3.2 Admin Audit Logs from Landing (Optional)
- **Location:** `app/page.tsx`
- **Current state:** Authenticated chief_registrar/admin users reach Audit Logs via Dashboard sidebar only
- **Enhancement:** Add optional quick link to `/admin/audit-logs` in landing hero or footer for chief_registrar/admin
- **Status:** Not a gap—convenience enhancement; listed for future reference only

---

## 4. API Routes Without Dedicated UI

**Status:** All VER API routes have corresponding UI:

| API | UI Location |
|-----|-------------|
| `/api/upload/multipart` | `/upload` page |
| `/api/documents/[id]/download` | Document detail page |
| `/api/properties/*` | Properties list, detail, import |
| `/api/verifications/*` | `/verify` page |
| `/api/reports/*` | Reports builder, schedules |
| `/api/admin/*` | Admin dashboard, Audit Logs page |

---

## 5. Task-to-Gap Mapping

| Task | Missing GUIs / Links |
|------|----------------------|
| **1** | — (Schema; no UI) |
| **2** | Unauthorized page (`/unauthorized`) |
| **3** | — (Types/validation; no UI) |
| **4** | — (Upload, documents list/detail ✅) |
| **5** | — (Hash Edge Function; no direct UI) |
| **6** | — (Audit logs UI ✅) |
| **7** | — (Verify page ✅) |
| **8** | — (Properties, map, import ✅) |
| **9** | — (Dashboards, user management in admin ✅) |
| **10** | — (Report builder, schedules ✅) |

---

## 6. Recommended Priority Order

1. **Low** — Add `/unauthorized` page and wire middleware 403 redirect
2. **Low** — Optional: Admin/chief_registrar quick link to Audit Logs from landing
3. **Out of scope** — User profile/settings, notification bell (PRD does not require)

---

## 7. Implementation Notes

- **User Management:** Implemented as embedded `UserManagement` component in Admin Dashboard (`/dashboard/admin`); no separate `/admin/users` page. Meets Task 9.4.
- **Role Management:** Role assignment via bulk-role API; PRD defines fixed roles (staff, verifier, chief_registrar, admin). No role CRUD UI required.
- **Audit Logs:** Standalone page at `/admin/audit-logs` plus `AuditLogsViewer` in Admin Dashboard.
- **Verification:** Dedicated `/verify` page with Verify with file, Manual decision, and Batch verify tabs.
