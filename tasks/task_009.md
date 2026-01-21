# Task ID: 9

**Title:** Role-Based Dashboard Implementation

**Status:** pending

**Dependencies:** 2, 7, 8

**Priority:** medium

**Description:** Create role-specific dashboards for staff, verifiers, chief registrar, and admin users with appropriate data access

**Details:**

Implement Next.js App Router pages for each role dashboard. Staff dashboard: upload history, verification status, document queue. Verifier dashboard: assigned documents, verification tools, decision history. Chief registrar dashboard: organization-wide analytics, rejection causes analysis, GIS map integration. Admin dashboard: user management, system configuration, audit logs. Use React Server Components for data fetching. Implement real-time updates using Supabase realtime subscriptions. Create responsive design with Tailwind CSS and shadcn/ui components. Add data export functionality.

**Test Strategy:**

Test role-based access restrictions on dashboard routes. Verify data filtering by user role. Test real-time updates functionality. Validate responsive design across devices. Performance test dashboard loading with large datasets.

## Subtasks

### 9.1. Create Staff Dashboard with Upload History and Document Queue

**Status:** pending  
**Dependencies:** None  

Implement the staff role dashboard page with upload history, verification status tracking, and document queue management functionality.

**Details:**

Create app/dashboard/staff/page.tsx using Next.js App Router with React Server Components. Implement data fetching for user's uploaded documents from ver_documents table filtered by uploader_id. Display upload history with document status, verification progress, and timestamps. Create document queue showing pending documents awaiting verification. Add real-time updates using Supabase realtime subscriptions for status changes. Use shadcn/ui components for data tables and status indicators. Implement responsive design with Tailwind CSS for mobile and desktop views.

### 9.2. Create Verifier Dashboard with Document Assignment and Verification Tools

**Status:** pending  
**Dependencies:** None  

Build the verifier role dashboard with assigned documents, verification tools, and decision history tracking.

**Details:**

Create app/dashboard/verifier/page.tsx with React Server Components for data fetching. Query ver_documents table for documents assigned to current verifier. Implement verification tools interface with document preview, hash comparison results, and decision input forms. Create decision history section showing past verification decisions from ver_verifications table. Add real-time notifications for new document assignments using Supabase realtime. Integrate with verification Edge Function for processing decisions. Use shadcn/ui components for forms, modals, and data display.

### 9.3. Create Chief Registrar Dashboard with Analytics and GIS Integration

**Status:** pending  
**Dependencies:** None  

Implement the chief registrar dashboard featuring organization-wide analytics, rejection analysis, and GIS map integration with property data.

**Details:**

Create app/dashboard/chief-registrar/page.tsx with comprehensive analytics components. Implement organization-wide statistics from ver_documents, ver_verifications, and ver_properties tables. Create rejection causes analysis with charts showing verification failure patterns. Integrate GIS map using Leaflet and MapLibre with PostGIS data from ver_properties table. Display property locations as GeoJSON layers with verification status indicators. Add filtering and search capabilities for map data. Implement data export functionality for analytics reports in CSV/PDF formats using libraries like jsPDF and csv-writer.

### 9.4. Create Admin Dashboard with User Management and System Configuration

**Status:** pending  
**Dependencies:** None  

Build the admin dashboard with comprehensive user management, system configuration, and audit log monitoring capabilities.

**Details:**

Create app/dashboard/admin/page.tsx with admin-specific functionality. Implement user management interface for creating, updating, and deactivating users across all roles (staff/verifier/chief_registrar/admin). Create system configuration panel for managing application settings, document retention policies, and verification parameters. Build audit log viewer displaying immutable audit trail from ver_logs table with filtering and search capabilities. Add user activity monitoring and system health metrics. Implement bulk user operations and role assignment functionality. Use shadcn/ui components for complex forms and data tables.

### 9.5. Implement Dashboard Layout and Real-time Updates Infrastructure

**Status:** pending  
**Dependencies:** 9.1, 9.2, 9.3, 9.4  

Create shared dashboard layout component and implement real-time update infrastructure using Supabase realtime subscriptions across all role dashboards.

**Details:**

Create app/dashboard/layout.tsx with shared navigation, role-based menu items, and responsive sidebar. Implement real-time subscription service using Supabase realtime for document status changes, new assignments, and system notifications. Create custom hooks (useRealtimeDocuments, useRealtimeNotifications) for managing subscriptions across dashboard components. Add notification system with toast messages for real-time updates. Implement loading states and error boundaries for all dashboard pages. Create shared components for common dashboard elements like status badges, progress indicators, and data export buttons. Ensure proper cleanup of subscriptions on component unmount.
