# OSC GUI & Route Audit - Tasks 1-11

## Overview
This document lists all routes (pages and API endpoints) in the OSC (One Stop Centre) title deed application system, maps them to Tasks 1-11, identifies which have UI components, and tracks navigation links.

**Project:** OSC - Title Deed Value Chain  
**Tasks Covered:** 1-11  
**Date:** 2025-02-08

---

## Pages (UI Routes)

### ✅ Created Pages with UI

| Route | Page File | Task | Status | In Navigation |
|-------|-----------|------|--------|---------------|
| `/` | `app/page.tsx` | — | ✅ | N/A (Public landing) |
| `/auth/signin` | `app/auth/signin/page.tsx` | 1 | ✅ | ✅ (from home, redirects) |
| `/unauthorized` | `app/unauthorized/page.tsx` | 1 | ✅ | N/A (Error page) |
| `/applications` | `app/(portal)/applications/page.tsx` | 3 | ✅ | ✅ (Portal nav, Home) |
| `/applications/new` | `app/(portal)/applications/new/page.tsx` | 3 | ✅ | ✅ (Portal nav, Home) |
| `/applications/[id]` | `app/(portal)/applications/[id]/page.tsx` | 3,4,8 | ✅ | ✅ (via My Applications) |
| `/admin` | `app/(admin)/admin/page.tsx` | Various | ✅ | ❌ (No link from layout) |
| `/admin/accounts` | `app/(admin)/admin/accounts/page.tsx` | 5 | ✅ | ✅ (Admin page) |
| `/admin/accounts/payments/[paymentId]` | `app/(admin)/admin/accounts/payments/[paymentId]/page.tsx` | 5 | ✅ | ✅ (via Accounts table) |
| `/admin/audit` | `app/(admin)/admin/audit/page.tsx` | 2 | ✅ | ✅ (Admin page) |
| `/admin/audit/trail` | `app/(admin)/admin/audit/trail/page.tsx` | 2 | ✅ | ✅ (via Audit form) |
| `/admin/lims` | `app/(admin)/admin/lims/page.tsx` | 6 | ✅ | ✅ (Admin page) |
| `/admin/lims/properties` | `app/(admin)/admin/lims/properties/page.tsx` | 6 | ✅ | ✅ (LIMS nav) |
| `/admin/lims/properties/[id]` | `app/(admin)/admin/lims/properties/[id]/page.tsx` | 6 | ✅ | ✅ (via Properties table) |
| `/admin/lims/allocations` | `app/(admin)/admin/lims/allocations/page.tsx` | 6 | ✅ | ✅ (LIMS nav) |
| `/admin/lims/exceptions` | `app/(admin)/admin/lims/exceptions/page.tsx` | 6 | ✅ | ✅ (LIMS nav) |
| `/admin/zlc` | `app/(admin)/admin/zlc/page.tsx` | 7 | ✅ | ✅ (Admin page) |
| `/admin/zlc/applications` | `app/(admin)/admin/zlc/applications/page.tsx` | 7 | ✅ | ✅ (ZLC nav) |
| `/admin/zlc/disputes` | `app/(admin)/admin/zlc/disputes/page.tsx` | 7 | ✅ | ✅ (ZLC nav) |
| `/dashboard` | `app/(dashboard)/dashboard/page.tsx` | 11 | ✅ | ✅ (Admin page) |

### ❌ Missing Pages (API exists but no dedicated UI)

| Route | API Endpoint | Task | Status | Notes |
|-------|--------------|------|--------|-------|
| `/admin/valuation` or application valuation UI | `POST/GET /api/applications/[id]/valuation/agreement` | 9 | ❌ | Valuation capture & Agreement of Sale generation - no UI |
| `/admin/deeds` or deeds section in application | `POST /api/deeds/applications/[id]/deductions/push` | 10 | ❌ | SG deduction push, conveyancer management - no UI |
| `/notifications` | — | 11 | ❌ | `osc_notifications` table exists, no Notification Center page |
| `/notifications/preferences` | — | 11 | ❌ | `osc_notification_preferences` exists, no preferences UI |
| `/admin/users` | — | 1 | ❌ | RBAC - no user/role management admin UI |
| `/admin/roles` | — | 1 | ❌ | RBAC - no role/permission management UI |

---

## API Routes Summary

### Total API Routes: 50

#### Applications (Task 3)
| Method | Route | Purpose |
|--------|-------|---------|
| GET/POST | `/api/applications` | List/create applications |
| GET/POST | `/api/applications/draft` | Draft applications |
| GET | `/api/applications/[id]/documents` | List documents |
| POST | `/api/applications/[id]/documents/upload` | Upload document |
| GET | `/api/applications/[id]/documents/[documentId]/download` | Download document |
| POST | `/api/applications/[applicationId]/submit` | Submit application |
| GET | `/api/applications/[applicationId]/map` | Application map data |

#### Audit (Task 2)
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/audit` | List audit logs |
| POST | `/api/audit/log` | Log audit event |
| GET | `/api/audit/export` | Export audit CSV |
| GET | `/api/audit/trails/[applicationId]` | Action trail for application |

#### Dashboards (Task 11)
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/dashboards/kpi` | KPI summary (cached) |
| POST | `/api/dashboards/kpi/refresh` | Refresh KPI views |

#### Deeds (Task 10)
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/deeds/applications/[applicationId]/deductions/push` | Push SG deductions |
| POST | `/api/webhooks/deeds-status` | Deeds registry webhook |

#### Legal (Task 7)
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/legal/analytics` | Legal analytics |
| GET | `/api/legal/applications` | Applications in ZLC |
| POST | `/api/legal/applications/[applicationId]/check` | Execute legal check |
| POST | `/api/legal/applications/[applicationId]/manual-check` | Manual check override |
| GET | `/api/legal/disputes` | List disputes |
| POST | `/api/legal/disputes/[id]/resolve` | Resolve dispute |

#### LIMS (Task 6)
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/lims/analytics` | LIMS analytics |
| GET/POST | `/api/lims/properties` | Properties CRUD |
| GET | `/api/lims/properties/[id]` | Property detail |
| GET | `/api/lims/allocations` | Allocations |
| GET | `/api/lims/exceptions` | Exceptions |
| POST | `/api/lims/exceptions/[id]/resolve` | Resolve exception |
| POST | `/api/lims/layouts/[id]/approve` | Approve layout |
| POST | `/api/lims/sync` | Sync from LIMS |
| POST | `/api/lims/applications/[applicationId]/validate` | Validate application |

#### Payments (Task 5)
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/payments` | List payments |
| GET | `/api/payments/analytics` | Payment analytics |
| POST | `/api/payments/bulk-confirm` | Bulk confirm |
| GET | `/api/payments/[paymentId]/confirm` | (page action) |
| GET | `/api/payments/[paymentId]/events` | Payment events |
| GET | `/api/payments/[paymentId]/receipts` | List receipts |
| POST | `/api/payments/[paymentId]/receipts/upload` | Upload receipt |
| GET | `/api/payments/[paymentId]/receipts/[receiptId]/download` | Download receipt |
| POST | `/api/payments/[paymentId]/receipts/[receiptId]/verify` | Verify receipt |
| POST | `/api/webhooks/payment-confirmation` | Payment webhook |

#### Survey (Task 8)
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/survey/beacons` | List beacons |
| GET | `/api/survey/applications/[applicationId]/beacons` | Application beacons |
| POST | `/api/survey/applications/[applicationId]/beacons` | Create beacon |
| GET | `/api/survey/applications/[applicationId]/diagram` | Diagram info |
| POST | `/api/survey/applications/[applicationId]/diagram` | Upload diagram |
| POST | `/api/survey/applications/[applicationId]/diagram/extract` | Extract beacons |
| GET | `/api/survey/applications/[applicationId]/map-data` | Map data |

#### Valuation (Task 9)
| Method | Route | Purpose |
|--------|-------|---------|
| GET/POST | `/api/applications/[applicationId]/valuation/agreement` | Generate/retrieve Agreement of Sale |

#### Workflow (Task 4)
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/workflow/[applicationId]/state` | Current state |
| POST | `/api/workflow/[applicationId]/transition` | State transition |
| GET | `/api/workflow/[applicationId]/sla` | SLA metrics |

#### Parcels
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/parcels/spatial` | Spatial query |

---

## Embedded UI Components (No standalone page)

| Component | Location | Task | Used In |
|-----------|----------|------|---------|
| WorkflowViewer | `components/workflow/` | 4 | Application detail |
| SurveySection | `components/survey/` | 8 | Application detail (when SURVEY_PENDING) |
| ApplicationMapViewer | `components/gis/` | 8 | Application detail |
| ReceiptManagement | `components/payments/` | 5 | Payment detail page |
| DocumentUpload | `components/application/` | 3 | New application form |
| MapSnapshotCapture | `components/gis/` | 3 | New application form |

---

## Navigation Structure

### Public / Home
- **Home** (`/`): Links to `/applications`, `/auth/signin`, `/applications/new`, `/applications`

### Portal (authenticated citizen)
- **Header**: "My Applications" → `/applications`, "New Application" → `/applications/new`

### Admin (authenticated, canAccessAdmin)
- **Admin page** (`/admin`): Links to:
  - KPI Dashboard → `/dashboard`
  - Accounts → `/admin/accounts`
  - LIMS → `/admin/lims`
  - ZLC Legal → `/admin/zlc`
  - Audit Logs → `/admin/audit`
- **Admin layout**: Header "OSC Admin" only — no persistent nav to sub-pages

### LIMS sub-pages
- Properties, Allocations, Exceptions, Sync, ← Back to Admin

### ZLC sub-pages
- Applications in ZLC, Disputes, ← Back to Admin

### Dashboard
- Link to Admin → `/admin`

---

## Navigation Gaps

1. **Admin layout** — No sidebar or header links to jump between Admin, Accounts, LIMS, ZLC, Audit, Dashboard without returning to `/admin`
2. **Dashboard** — Only reachable from Admin page; not in a shared top-level nav
3. **Portal ↔ Admin** — No link from portal to admin (or vice versa for citizens)
4. **Notifications** — No notification center or preferences page linked anywhere
5. **Valuation** — No UI to capture valuation or generate Agreement of Sale
6. **Deeds** — No admin UI for conveyancers, SG deductions, or deeds status
7. **RBAC** — No user/role management UI for system administrators
