# Task ID: 1

**Title:** Database Schema Setup and Migrations

**Status:** pending

**Dependencies:** None

**Priority:** high

**Description:** Create Supabase database schema with all required tables prefixed with 'ver_' and implement Row Level Security (RLS) policies

**Details:**

Create SQL migrations for ver_profiles, ver_properties, ver_documents, ver_document_hashes, ver_verifications, and ver_logs tables. Use Supabase CLI v1.127+ for migration management. Implement PostGIS extension for spatial data in ver_properties table with geometry column. Set up RLS policies for each table based on user roles. Create indexes for performance: btree on document_id, property_id, created_at columns, and spatial index (GIST) on geometry column. Use UUID primary keys with gen_random_uuid() defaults. Implement foreign key constraints with CASCADE deletes where appropriate.

**Test Strategy:**

Run migrations against local Supabase Docker instance. Verify all tables exist with correct schema. Test RLS policies by attempting unauthorized access from different user contexts. Validate spatial queries work correctly with PostGIS functions. Check index performance with EXPLAIN ANALYZE on common query patterns.

## Subtasks

### 1.1. Initialize Supabase Project and PostGIS Extension Setup

**Status:** pending  
**Dependencies:** None  

Set up local Supabase Docker instance and configure PostGIS extension for spatial data support

**Details:**

Initialize local Supabase project using Docker. Install and configure PostGIS extension for spatial data handling. Set up Supabase CLI v1.127+ for migration management. Configure database connection settings and verify PostGIS functions are available for geometry operations.

### 1.2. Create Core Database Tables with ver_ Prefix

**Status:** pending  
**Dependencies:** 1.1  

Create SQL migrations for all required tables with proper schema structure and UUID primary keys

**Details:**

Create migration files for ver_profiles, ver_properties, ver_documents, ver_document_hashes, ver_verifications, and ver_logs tables. Implement UUID primary keys with gen_random_uuid() defaults. Add geometry column to ver_properties table for spatial data. Define proper column types, constraints, and foreign key relationships with CASCADE deletes where appropriate.

### 1.3. Implement Row Level Security (RLS) Policies

**Status:** pending  
**Dependencies:** 1.2  

Create comprehensive RLS policies for each table based on user roles and access patterns

**Details:**

Enable RLS on all ver_ tables. Create policies for staff, verifier, chief_registrar, and admin roles. Implement read/write restrictions based on user roles and data ownership. Set up policies for ver_profiles (users can only access their own), ver_documents (role-based access), ver_verifications (verifiers can create, all can read), and ver_logs (admin read-only).

### 1.4. Create Performance Indexes and Spatial Indexing

**Status:** pending  
**Dependencies:** 1.2  

Implement btree and spatial indexes for optimal query performance across all tables

**Details:**

Create btree indexes on frequently queried columns: document_id, property_id, created_at across relevant tables. Implement GIST spatial index on geometry column in ver_properties table for efficient spatial queries. Add composite indexes for common query patterns. Create indexes on foreign key columns and status fields for faster filtering operations.

### 1.5. Validate Schema Integration and Migration Testing

**Status:** pending  
**Dependencies:** 1.3, 1.4  

Comprehensive testing of complete database schema with all components integrated

**Details:**

Execute full migration suite from clean database state. Test all table relationships and constraints. Verify RLS policies work correctly with indexes in place. Test spatial data insertion and querying with PostGIS functions. Validate that all UUID generation, foreign key cascades, and role-based access controls function as expected in integrated environment.
