# Task ID: 6

**Title:** Audit Logging System

**Status:** pending

**Dependencies:** 1, 2, 3

**Priority:** medium

**Description:** Implement comprehensive audit logging for all user actions with immutable log records

**Details:**

Create lib/audit module with logging functions for all actions (upload, hash, verify, delete, export). Implement ver_logs table inserts with structured JSONB details column. Capture actor_id, action type, target information, IP address, and user agent. Create audit middleware for automatic logging of API calls. Implement log retention policies and archival strategies. Use database triggers for sensitive operations to ensure logging cannot be bypassed. Create audit log viewer for administrators with filtering and search capabilities.

**Test Strategy:**

Verify all critical actions generate audit logs. Test log immutability (no updates/deletes allowed). Validate JSONB structure and searchability. Test audit log viewer with various filters. Performance test log insertion under high load.

## Subtasks

### 6.1. Create ver_logs Database Table and Audit Schema

**Status:** pending  
**Dependencies:** None  

Design and implement the ver_logs table with immutable audit log structure and JSONB details column

**Details:**

Create ver_logs table with columns: id (UUID primary key), actor_id (UUID foreign key to auth.users), action_type (enum: upload, hash, verify, delete, export, login, logout), target_type (varchar), target_id (UUID), ip_address (inet), user_agent (text), details (JSONB), created_at (timestamptz with default now()). Add database constraints to prevent updates/deletes. Create indexes on actor_id, action_type, created_at, and JSONB details for efficient querying. Implement database triggers to ensure immutability.

### 6.2. Implement Core Audit Logging Library

**Status:** pending  
**Dependencies:** 6.1  

Create lib/audit module with TypeScript functions for logging all user actions with structured data

**Details:**

Create lib/audit/index.ts with functions: logUpload(), logHash(), logVerify(), logDelete(), logExport(), logAuth(). Each function accepts actor_id, target information, IP address, user agent, and action-specific details. Implement createAuditLog() base function that inserts into ver_logs table with proper JSONB structure. Add TypeScript interfaces for AuditLogEntry and action-specific detail types. Include error handling and validation for required fields.

### 6.3. Create Audit Middleware for Automatic API Logging

**Status:** pending  
**Dependencies:** 6.2  

Implement Next.js middleware to automatically capture and log all API calls and user actions

**Details:**

Create middleware/audit.ts that intercepts all API routes and server actions. Extract user information from Supabase session, capture IP address from request headers, and log API calls with request/response metadata. Implement request/response wrapping to capture action outcomes. Add filtering to exclude health checks and non-sensitive endpoints. Integrate with existing auth middleware to ensure proper user context. Handle both successful and failed operations with appropriate detail levels.

### 6.4. Implement Database Triggers for Sensitive Operations

**Status:** pending  
**Dependencies:** 6.1  

Create PostgreSQL triggers to ensure critical database operations are automatically logged and cannot bypass audit system

**Details:**

Create database triggers on ver_documents, ver_document_hashes, ver_verifications, and ver_properties tables for INSERT, UPDATE, DELETE operations. Implement trigger functions that automatically insert audit records for sensitive data changes. Use TG_OP to determine operation type and capture OLD/NEW record values in JSONB details. Ensure triggers execute with SECURITY DEFINER to prevent privilege escalation. Add trigger for user role changes in auth schema. Include error handling to prevent trigger failures from blocking operations.

### 6.5. Build Audit Log Viewer and Retention Management

**Status:** pending  
**Dependencies:** 6.2, 6.3  

Create administrator interface for viewing, filtering, and managing audit logs with retention policies

**Details:**

Create pages/admin/audit-logs.tsx with data table using shadcn/ui components. Implement server-side filtering by date range, user, action type, and target. Add search functionality for JSONB details using PostgreSQL operators. Create audit log export to CSV/PDF formats. Implement log retention policies with configurable retention periods by action type. Add archival functionality to move old logs to separate archive table. Include pagination for large result sets and real-time log streaming for active monitoring.
