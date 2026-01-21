# Route Audit - Tasks 1-20

## Overview
This document lists all routes (pages and API endpoints) created for tasks 1-20, identifies which have UI components, and tracks navigation links.

## Pages (UI Routes)

### ✅ Created Pages with UI

| Route | Page File | Task | Status | In Navigation |
|-------|-----------|------|--------|---------------|
| `/` | `app/page.tsx` | 14 | ✅ | ❌ (Public landing) |
| `/dashboard` | `app/dashboard/page.tsx` | 20.1 | ✅ | ✅ |
| `/dashboard/properties` | `app/dashboard/properties/page.tsx` | 20.1 | ✅ | ❌ |
| `/dashboard/financial` | `app/dashboard/financial/page.tsx` | 20.1 | ✅ | ❌ |
| `/dashboard/maintenance` | `app/dashboard/maintenance/page.tsx` | 20.1 | ✅ | ❌ |
| `/properties` | `app/properties/page.tsx` | 15 | ✅ | ✅ |
| `/properties/[id]` | `app/properties/[id]/page.tsx` | 15 | ✅ | ✅ (via properties) |
| `/properties/[id]/map` | `app/properties/[id]/map/page.tsx` | 19 | ✅ | ✅ (via properties) |
| `/leases` | `app/leases/page.tsx` | 16 | ✅ | ✅ |
| `/leases/new` | `app/leases/new/page.tsx` | 16 | ✅ | ✅ (via leases) |
| `/leases/[id]` | `app/leases/[id]/page.tsx` | 16 | ✅ | ✅ (via leases) |
| `/applications` | `app/applications/page.tsx` | 16 | ✅ | ✅ |
| `/applications/new` | `app/applications/new/page.tsx` | 16 | ✅ | ✅ (via applications) |
| `/applications/[id]` | `app/applications/[id]/page.tsx` | 16 | ✅ | ✅ (via applications) |
| `/maintenance/request` | `app/maintenance/request/page.tsx` | 18 | ✅ | ❌ |
| `/map` | `app/map/page.tsx` | 19 | ✅ | ✅ |
| `/reports` | `app/reports/page.tsx` | 20.2 | ✅ | ❌ (wrong path in nav) |
| `/notifications` | `app/notifications/page.tsx` | 20.3 | ✅ | ❌ |
| `/alerts` | `app/alerts/page.tsx` | 20.4 | ✅ | ✅ |
| `/alerts/preferences` | `app/alerts/preferences/page.tsx` | 20.3 | ✅ | ❌ |
| `/admin` | `app/admin/page.tsx` | Various | ✅ | ✅ |
| `/admin/users` | `app/admin/users/page.tsx` | 2 | ✅ | ✅ |
| `/admin/roles` | `app/admin/roles/page.tsx` | 2 | ✅ | ✅ |
| `/admin/organizations` | `app/admin/organizations/page.tsx` | 2 | ✅ | ✅ |
| `/admin/departments` | `app/admin/departments/page.tsx` | 2 | ✅ | ❌ |
| `/admin/audit-events` | `app/admin/audit-events/page.tsx` | 3 | ✅ | ✅ |
| `/admin/notification-rules` | `app/admin/notification-rules/page.tsx` | 20.4 | ✅ | ❌ |
| `/profile` | `app/profile/page.tsx` | 1 | ✅ | ✅ (Topbar) |
| `/tenant` | `app/tenant/page.tsx` | 16 | ✅ | ❌ |
| `/tenant/deposits` | `app/tenant/deposits/page.tsx` | 16 | ✅ | ❌ |
| `/tenant/notifications` | `app/tenant/notifications/page.tsx` | 16 | ✅ | ❌ |
| `/activity` | `app/activity/page.tsx` | 3 | ✅ | ❌ |
| `/sessions` | `app/sessions/page.tsx` | 1 | ✅ | ❌ |

### ❌ Missing Pages (API exists but no UI)

| Route | API Endpoint | Task | Status | Notes |
|-------|--------------|------|--------|-------|
| `/invoices` | `/api/invoices` | 17 | ❌ | Invoice list page needed |
| `/invoices/[id]` | `/api/invoices/[id]` | 17 | ❌ | Invoice detail page needed |
| `/payments` | `/api/payments` | 17 | ❌ | Payment list page needed |
| `/payments/[id]` | `/api/payments/[id]` | 17 | ❌ | Payment detail page needed |
| `/arrears` | `/api/arrears/*` | 17 | ❌ | Arrears management page needed |
| `/budgets` | `/api/budgets` | 17 | ❌ | Budget management page needed |
| `/maintenance/work-orders` | `/api/maintenance/work-orders` | 18 | ❌ | Work orders list page needed |
| `/maintenance/work-orders/[id]` | `/api/maintenance/work-orders/[id]` | 18 | ❌ | Work order detail page needed |
| `/maintenance/contractors` | `/api/maintenance/contractors` | 18 | ❌ | Contractors list page needed |
| `/maintenance/contractors/[id]` | `/api/maintenance/contractors/[id]` | 18 | ❌ | Contractor detail page needed |
| `/maintenance/projects` | `/api/maintenance/projects` | 18 | ❌ | Renovation projects page needed |
| `/maintenance/approvals` | `/api/maintenance/approvals` | 18 | ❌ | Approval workflow page needed |
| `/gis/approvals` | `/api/gis/geometry-proposals` | 19.5 | ❌ | GIS approval workflow page needed |
| `/gis/analytics` | `/api/gis/analytics/*` | 19.5 | ❌ | Spatial analytics page needed |

### 🧪 Test Pages (Should not be in production nav)

| Route | Purpose | Status |
|-------|---------|--------|
| `/test-auth-flow` | Auth testing | ✅ |
| `/test-connection` | Connection testing | ✅ |
| `/test-rbac` | RBAC testing | ✅ |
| `/test-rls` | RLS testing | ✅ |
| `/test-rls-enforcement` | RLS enforcement testing | ✅ |
| `/test-session-management` | Session testing | ✅ |
| `/debug-permissions` | Permission debugging | ✅ |
| `/unauthorized` | Error page | ✅ |

## API Routes Summary

### Total API Routes: 145

#### By Category:

**Authentication & Authorization (Tasks 1-2)**
- `/api/auth/login`
- `/api/auth/logout`
- `/api/auth/signup`

**Properties & Cadastre (Task 15)**
- `/api/properties`
- `/api/properties/[id]`
- `/api/properties/[id]/status`
- `/api/properties/[id]/images`
- `/api/properties/[id]/images/[imageId]`
- `/api/properties/[id]/documents`
- `/api/properties/[id]/documents/[documentId]`
- `/api/properties/search`
- `/api/properties/search/map-bounds`
- `/api/properties/map`
- `/api/buildings`
- `/api/buildings/[id]`
- `/api/parcels`
- `/api/parcels/[id]`
- `/api/parcels/[id]/geometry`
- `/api/parcels/spatial`

**Leases & Applications (Task 16)**
- `/api/leases`
- `/api/leases/[id]`
- `/api/leases/[id]/status`
- `/api/leases/[id]/deposits`
- `/api/leases/[id]/documents`
- `/api/leases/[id]/documents/[documentId]/signatures`
- `/api/leases/[id]/handover`
- `/api/applications`
- `/api/units`
- `/api/units/[id]`

**Financial Management (Task 17)**
- `/api/invoices`
- `/api/invoices/[id]`
- `/api/invoices/[id]/allocate`
- `/api/invoices/schedule`
- `/api/payments`
- `/api/payments/[id]`
- `/api/payments/[id]/allocate`
- `/api/payments/[id]/match`
- `/api/payments/allocations/[id]`
- `/api/payments/reconcile`
- `/api/arrears/calculate`
- `/api/arrears/snapshots`
- `/api/arrears/payment-plans`
- `/api/arrears/payment-plans/[id]`
- `/api/arrears/late-fees`
- `/api/arrears/notifications`
- `/api/arrears/reports`
- `/api/budgets`
- `/api/budgets/[id]`
- `/api/finances/dashboard`
- `/api/finances/reports/pl`
- `/api/finances/reports/budget-vs-actual`
- `/api/finances/reports/cashflow`
- `/api/finances/reports/export`

**Maintenance Management (Task 18)**
- `/api/maintenance/requests`
- `/api/maintenance/requests/[id]`
- `/api/maintenance/requests/[id]/work-orders`
- `/api/maintenance/work-orders`
- `/api/maintenance/work-orders/[id]`
- `/api/maintenance/work-orders/sla`
- `/api/maintenance/work-orders/contractors/match`
- `/api/maintenance/work-orders/contractors/[id]/availability`
- `/api/maintenance/contractors`
- `/api/maintenance/contractors/[id]`
- `/api/maintenance/contractors/[id]/performance`
- `/api/maintenance/contractors/[id]/availability`
- `/api/maintenance/contractors/[id]/communication`
- `/api/maintenance/contractors/[id]/payments`
- `/api/maintenance/contractors/[id]/reviews`
- `/api/maintenance/projects`
- `/api/maintenance/projects/[id]`
- `/api/maintenance/renovations`
- `/api/maintenance/renovations/[id]`
- `/api/maintenance/approvals`
- `/api/maintenance/analytics/dashboard`

**GIS & Spatial (Task 19)**
- `/api/gis/layers`
- `/api/gis/search`
- `/api/gis/search/saved`
- `/api/gis/search/saved/[id]`
- `/api/gis/geometry-proposals`
- `/api/gis/geometry-proposals/[id]/approve`
- `/api/gis/geometry-proposals/[id]/reject`
- `/api/parcels/spatial` (also listed above)

**Dashboard & Reporting (Task 20)**
- `/api/dashboard/kpi`
- `/api/dashboard/widgets`
- `/api/analytics/occupancy`
- `/api/analytics/revenue`
- `/api/analytics/arrears`
- `/api/analytics/maintenance-costs`
- `/api/analytics/kpi`
- `/api/reports/templates`
- `/api/reports/saved`
- `/api/reports/saved/[id]`
- `/api/reports/generate`
- `/api/reports/export`

**Notifications & Alerts (Task 20)**
- `/api/notifications`
- `/api/notifications/[id]`
- `/api/notifications/mark-all-read`
- `/api/notifications/preferences`
- `/api/notifications/templates`
- `/api/notifications/business-rules/check`
- `/api/notifications/escalate`
- `/api/notifications/scheduler/logs`
- `/api/notifications/scheduler/configs`
- `/api/notifications/scheduler/trigger`
- `/api/alerts`
- `/api/alerts/[id]`
- `/api/alerts/preferences`
- `/api/alerts/generate`

**Documents (Task 10)**
- `/api/documents/upload`
- `/api/documents/[id]`
- `/api/documents/[id]/download`
- `/api/documents/[id]/preview`
- `/api/documents/[id]/preview-page`
- `/api/documents/[id]/versions`
- `/api/documents/search`
- `/api/documents/ocr/jobs`
- `/api/documents/generate-lease`

**Activity & Audit (Task 3)**
- `/api/activity`

**Tenant Portal (Task 16)**
- `/api/tenant/deposits`
- `/api/tenant/leases`
- `/api/tenant/notifications/preferences`
- `/api/tenant/notifications/schedule`

**ERP Integration (Task 17)**
- `/api/erp/sync`

**Search**
- `/api/search`

## Navigation Issues

### Missing from Navigation:
1. ❌ `/reports` - Currently linked as `/dashboard/reports` (wrong path)
2. ❌ `/notifications` - Not in navigation
3. ❌ `/dashboard/properties` - Dashboard sub-page
4. ❌ `/dashboard/financial` - Dashboard sub-page
5. ❌ `/dashboard/maintenance` - Dashboard sub-page
6. ❌ `/maintenance/request` - Maintenance sub-page
7. ❌ `/alerts/preferences` - Alerts sub-page
8. ❌ `/admin/departments` - Admin sub-page
9. ❌ `/admin/notification-rules` - Admin sub-page
10. ❌ `/tenant` - Tenant portal
11. ❌ `/activity` - Activity feed
12. ❌ `/sessions` - Session management

### Navigation Structure Needed:
- Dashboard (with sub-items)
- Properties
- Leases
- Applications
- Maintenance (with sub-items)
- GIS Map
- Reports
- Notifications
- Alerts (with sub-items)
- Admin (with sub-items)
- Tenant Portal (conditional)
