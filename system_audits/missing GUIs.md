# Missing GUIs, Links, and Navigations - OSC Tasks 1-11

**Date:** 2025-02-08  
**Scope:** OSC Title Deed Application System  
**Reference:** See `system_audits/GUI_ROUTE_AUDIT.md` for full route inventory

---

## Executive Summary

| Category | Count |
|----------|-------|
| Missing full pages | 6 |
| Missing UI components/sections | 4 |
| Missing navigation links | 7 |
| API routes without any UI | 2 |

---

## 1. Missing Full Pages

### 1.1 Notification Center (Task 11)
- **Route needed:** `/notifications`
- **Task:** 11.1, 11.2 — Notifications database and delivery modules exist
- **Description:** Page to list in-app notifications for the current user (read/unread, filters, mark as read)
- **Data source:** `osc_notifications` table, `lib/notifications/inapp.ts`
- **Permission:** Authenticated users (own notifications)

### 1.2 Notification Preferences (Task 11)
- **Route needed:** `/notifications/preferences` or `/profile/notifications`
- **Task:** 11.3 — User preference management mentioned
- **Description:** Page to manage notification channels (email, SMS, in-app) and workflow event preferences
- **Data source:** `osc_notification_preferences` table
- **Permission:** Authenticated users (own preferences)

### 1.3 RBAC User Management (Task 1)
- **Route needed:** `/admin/users`
- **Task:** 1.5 — RBAC integration with admin routes
- **Description:** Admin page to view users, assign roles, manage `osc_user_roles`
- **Data source:** `auth.users` (read-only), `osc_user_roles`, `osc_roles`
- **Permission:** `rbac:manage` or `admin:manage`

### 1.4 RBAC Role & Permission Management (Task 1)
- **Route needed:** `/admin/roles`
- **Task:** 1.5 — RBAC integration
- **Description:** Admin page to view/edit roles, permissions, `osc_role_permissions`
- **Data source:** `osc_roles`, `osc_permissions`, `osc_role_permissions`
- **Permission:** `rbac:manage` or `admin:manage`

### 1.5 Valuation Capture & Agreement UI (Task 9)
- **Route needed:** `/admin/valuation` or embedded in application flow at `/applications/[id]`
- **Task:** 9.2, 9.3 — Valuation module and Agreement of Sale exist
- **Description:** UI to capture valuation (cash/installment/mortgage), payment plans, and trigger Agreement of Sale generation
- **API:** `POST/GET /api/applications/[applicationId]/valuation/agreement`
- **Permission:** `valuation:manage`

### 1.6 Deeds Admin UI (Task 10)
- **Route needed:** `/admin/deeds` or section in application detail
- **Task:** 10.2, 10.3 — Deeds module and SG deductions exist
- **Description:** UI for conveyancer management, SG deduction push, deeds status/view per application
- **API:** `POST /api/deeds/applications/[applicationId]/deductions/push`
- **Permission:** `deeds:manage`

---

## 2. Missing UI Components / Sections

### 2.1 Valuation Section on Application Detail
- **Location:** `app/(portal)/applications/[id]/page.tsx` or dedicated Valuation tab
- **Task:** 9
- **Description:** Add section or button to:
  - View/capture valuation for application
  - Generate Agreement of Sale (calls `/api/applications/[id]/valuation/agreement`)
  - Download generated agreement PDF
- **Visibility:** When workflow allows valuation stage; users with `valuation:manage`

### 2.2 Deeds / SG Deductions Section on Application Detail
- **Location:** `app/(portal)/applications/[id]/page.tsx` or admin application view
- **Task:** 10
- **Description:** Add section to:
  - View deeds status
  - Trigger SG deduction push for applications with pending deductions
  - View conveyancer assignment (if applicable)
- **Visibility:** Officers with `deeds:manage`

### 2.3 Agreement of Sale Download Link
- **Location:** Application detail or Valuation section
- **Task:** 9.3
- **Description:** If agreement exists, show download link (API returns `agreementPath` and download URL)
- **Current state:** API supports GET with `?action=download`; no UI calls it

### 2.4 Notification Bell / Badge in Header
- **Location:** Portal layout, Admin layout, Dashboard layout
- **Task:** 11
- **Description:** Notification icon with unread count, dropdown or link to `/notifications`
- **Current state:** No notification UI in any layout

---

## 3. Missing Navigation Links

### 3.1 Admin Layout — Persistent Navigation
- **Location:** `app/(admin)/layout.tsx`
- **Issue:** Header shows only "OSC Admin" text. No links to sub-pages.
- **Needed:** Sidebar or header nav with links to:
  - `/admin` (Dashboard)
  - `/dashboard` (KPI Dashboard)
  - `/admin/accounts`
  - `/admin/lims`
  - `/admin/zlc`
  - `/admin/audit`

### 3.2 Dashboard Layout — Link to Admin
- **Current:** Dashboard has "Admin" link.
- **Needed:** Consider adding KPI Dashboard to admin nav so both layouts have consistent access.

### 3.3 Portal — Link to Admin (for officers)
- **Location:** `app/(portal)/layout.tsx`
- **Issue:** Citizens and officers share portal. Officers with admin access have no way to reach `/admin` from portal.
- **Needed:** If user has `canAccessAdmin`, show "Admin" or "Officer Dashboard" link in portal header.

### 3.4 Home Page — Link to Admin
- **Location:** `app/page.tsx`
- **Issue:** Home links to applications and sign-in only.
- **Needed:** For authenticated admin users, show "Admin" link (or redirect if appropriate).

### 3.5 Admin Page — Links to New Pages
- **Location:** `app/(admin)/admin/page.tsx`
- **Needed:** Add links when pages exist:
  - Notifications → `/notifications` (or Notification Center)
  - Users → `/admin/users`
  - Roles → `/admin/roles`
  - Deeds → `/admin/deeds` (or equivalent)
  - Valuation → `/admin/valuation` (or application-scoped)

### 3.6 Notification Center → Preferences
- **When built:** Notification Center page should link to `/notifications/preferences`.

### 3.7 User Profile / Settings Entry Point
- **Issue:** No `/profile` or `/settings` page. Notification preferences could live under profile.
- **Needed:** Profile/settings page or ensure preferences are reachable from notification UI.

---

## 4. API Routes Without UI

### 4.1 Deeds Deductions Push
- **API:** `POST /api/deeds/applications/[applicationId]/deductions/push`
- **UI needed:** Button or action in Deeds admin UI or application detail
- **Task:** 10.3

### 4.2 Valuation Agreement (Generate & Download)
- **API:** `POST /api/applications/[applicationId]/valuation/agreement` (generate)  
  `GET /api/applications/[applicationId]/valuation/agreement?action=download` (download)
- **UI needed:** Button to generate, link to download when ready
- **Task:** 9.3

---

## 5. Task-to-Gap Mapping

| Task | Missing GUIs / Links |
|------|----------------------|
| **1** | User management (`/admin/users`), Role management (`/admin/roles`) |
| **2** | — (Audit UI exists) |
| **3** | — (Application UI exists) |
| **4** | — (WorkflowViewer in app detail) |
| **5** | — (Accounts dashboard, payment detail exist); Task 5.5 may need reporting enhancements |
| **6** | — (LIMS UI complete) |
| **7** | — (ZLC UI complete) |
| **8** | — (Survey section, map in app detail) |
| **9** | Valuation capture UI, Agreement generation button, download link |
| **10** | Deeds admin UI, SG deduction push button, conveyancer view |
| **11** | Notification Center page, Notification preferences page, notification bell in layouts |

---

## 6. Recommended Priority Order

1. **High** — Valuation & Agreement UI (Task 9): Core to application flow
2. **High** — Deeds admin & SG deductions (Task 10): Required for deeds workflow
3. **Medium** — Notification Center (Task 11): Improves user experience
4. **Medium** — Admin layout persistent nav: Improves officer workflow
5. **Medium** — Notification preferences (Task 11)
6. **Low** — RBAC user/role management (Task 1): Needed for production admin
7. **Low** — Portal/Home links to Admin for officers
