# Task ID: 2

**Title:** Authentication and RBAC Implementation

**Status:** pending

**Dependencies:** 1

**Priority:** high

**Description:** Implement Supabase Auth integration with role-based access control for staff, verifier, chief_registrar, and admin roles

**Details:**

Configure Supabase Auth with email/password authentication. Create lib/auth module with TypeScript interfaces for UserRole enum ('staff' | 'verifier' | 'chief_registrar' | 'admin'). Implement createBrowserClient() and createServerClient() in lib/supabase using @supabase/ssr v0.5+. Create middleware.ts for route protection using Next.js 16.* middleware. Implement requireRole() helper function for server actions and API routes. Set up user profile creation trigger in Postgres to auto-create ver_profiles record on auth.users insert. Use Supabase's built-in JWT claims for role storage.

**Test Strategy:**

Unit tests for role validation functions. Integration tests for auth flow including sign-up, sign-in, and role assignment. Test middleware protection on protected routes. Verify JWT token contains correct role claims. Test session persistence across browser refreshes.

## Subtasks

### 2.1. Configure Supabase Auth with Email/Password Authentication

**Status:** pending  
**Dependencies:** None  

Set up Supabase Auth configuration for email/password authentication with proper environment variables and client initialization

**Details:**

Configure Supabase project with Auth settings enabled. Set up environment variables for SUPABASE_URL and SUPABASE_ANON_KEY. Initialize Supabase clients using @supabase/ssr v0.5+ with createBrowserClient() and createServerClient() functions. Configure auth providers and email templates. Set up proper CORS settings and redirect URLs for local development and production environments.

### 2.2. Create TypeScript Auth Module with Role Interfaces

**Status:** pending  
**Dependencies:** 2.1  

Implement lib/auth module with TypeScript interfaces for UserRole enum and authentication utilities

**Details:**

Create lib/auth/index.ts with UserRole enum defining 'staff', 'verifier', 'chief_registrar', and 'admin' roles. Implement TypeScript interfaces for User, Session, and AuthState. Create utility functions for role checking, user session management, and auth state handling. Implement type-safe wrappers around Supabase auth methods with proper error handling and type assertions.

### 2.3. Implement Next.js Middleware for Route Protection

**Status:** pending  
**Dependencies:** 2.2  

Create middleware.ts for protecting routes based on authentication status and user roles using Next.js 16.* middleware

**Details:**

Create middleware.ts in project root using Next.js 16.* middleware API. Implement route protection logic that checks authentication status and user roles. Define protected route patterns and role-based access rules. Handle redirects for unauthenticated users to login page and unauthorized users to appropriate dashboards. Implement session refresh logic and proper error handling for expired tokens.

### 2.4. Create requireRole Helper Function for Server Actions

**Status:** pending  
**Dependencies:** 2.2  

Implement requireRole() helper function for server actions and API routes with JWT claims validation

**Details:**

Create requireRole() function in lib/auth that validates user authentication and role permissions for server actions and API routes. Implement JWT token validation and role extraction from Supabase's built-in JWT claims. Add proper error handling for unauthorized access attempts. Create wrapper functions for common role checks (isStaff, isVerifier, isChiefRegistrar, isAdmin). Ensure function works with both server actions and API route handlers.

### 2.5. Set Up User Profile Creation Trigger in Postgres

**Status:** pending  
**Dependencies:** 2.1  

Create database trigger to automatically create ver_profiles record when new user signs up through Supabase Auth

**Details:**

Create PostgreSQL trigger function that automatically inserts a record into ver_profiles table when a new user is created in auth.users. Set up proper foreign key relationships and default role assignment. Implement trigger to handle user metadata and profile initialization. Ensure trigger handles edge cases like duplicate insertions and maintains data consistency. Configure proper permissions and security for the trigger function.
