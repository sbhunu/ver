# Task 2.4: requireRole Helper Function for Server Actions - Summary

## ✅ Completed

### 1. Enhanced requireRole Function (`lib/auth/require-role.ts`)

**Core Functions:**
- ✅ `requireRole()` - For Server Actions (uses redirect)
- ✅ `requireRoleAPI()` - For API Route Handlers (returns NextResponse)
- ✅ `extractRoleFromJWT()` - Extracts role from JWT claims with database fallback
- ✅ `getAuthenticatedUserWithRole()` - Gets user with role from JWT or database

**JWT Claims Validation:**
- ✅ Extracts role from `user_metadata.role` (JWT claim)
- ✅ Extracts role from `app_metadata.role` (JWT claim)
- ✅ Falls back to database lookup if not in JWT
- ✅ Validates role values against allowed roles

**Error Handling:**
- ✅ `AuthenticationError` class - For authentication failures (401)
- ✅ `AuthorizationError` class - For authorization failures (403)
- ✅ `handleAuthError()` - Converts errors to NextResponse for API routes
- ✅ Proper error messages with role information

**Role-Specific Wrappers (Server Actions):**
- ✅ `isStaff()` - Requires staff or higher
- ✅ `isVerifier()` - Requires verifier or higher
- ✅ `isChiefRegistrar()` - Requires chief registrar or higher
- ✅ `isAdmin()` - Requires admin

**Role-Specific Wrappers (API Routes):**
- ✅ `isStaffAPI()` - Requires staff or higher
- ✅ `isVerifierAPI()` - Requires verifier or higher
- ✅ `isChiefRegistrarAPI()` - Requires chief registrar or higher
- ✅ `isAdminAPI()` - Requires admin

### 2. API Route Helpers (`lib/auth/api-helpers.ts`)

**Wrapper Functions:**
- ✅ `withAuth()` - Wraps API route with role requirement
- ✅ `withAuthAny()` - Wraps API route for any authenticated user
- ✅ Type guards for error checking

**Features:**
- ✅ Automatic error handling
- ✅ Cleaner API route code
- ✅ Type-safe user object in handler

### 3. Usage Examples (`lib/auth/examples.ts`)

- ✅ Server Action examples
- ✅ API Route Handler examples
- ✅ Role-specific wrapper examples
- ✅ Error handling examples

## 📁 File Structure

```
lib/auth/
├── require-role.ts    (249 lines) - Core requireRole functions
├── api-helpers.ts     (77 lines)  - API route wrappers
└── examples.ts        (116 lines) - Usage examples
```

## 🎯 Key Features

### JWT Claims Support
- ✅ Extracts role from Supabase JWT claims (`user_metadata` or `app_metadata`)
- ✅ Falls back to database if role not in JWT
- ✅ Validates role values

### Dual Mode Support
- ✅ **Server Actions**: Uses `redirect()` for unauthenticated users
- ✅ **API Routes**: Returns `NextResponse` with error status codes
- ✅ Separate functions for each use case

### Error Handling
- ✅ Typed error classes (`AuthenticationError`, `AuthorizationError`)
- ✅ Proper HTTP status codes (401, 403)
- ✅ Error handler for API routes
- ✅ Descriptive error messages

### Role Hierarchy
- ✅ Respects role hierarchy (staff < verifier < chief_registrar < admin)
- ✅ Users with higher roles can access lower-role routes
- ✅ Exact role matching available via wrappers

## 📝 Usage Examples

### Server Actions

```typescript
'use server'

import { requireRole, UserRole } from '@/lib/auth'

export async function adminAction() {
  // Require admin role
  const user = await requireRole(UserRole.ADMIN)
  
  // User is guaranteed to be admin
  // Proceed with admin-only logic
  return { success: true }
}
```

### Using Role-Specific Wrappers

```typescript
'use server'

import { isAdmin } from '@/lib/auth'

export async function adminOnlyAction() {
  // isAdmin() is equivalent to requireRole(UserRole.ADMIN)
  const user = await isAdmin()
  
  return { userId: user.id }
}
```

### API Route Handlers

```typescript
import { requireRoleAPI, handleAuthError, UserRole } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const user = await requireRoleAPI(UserRole.VERIFIER)
    
    return NextResponse.json({ 
      data: 'Verifier data',
      userId: user.id 
    })
  } catch (error) {
    return handleAuthError(error)
  }
}
```

### Using API Wrappers

```typescript
import { withAuth, UserRole } from '@/lib/auth'

export async function POST(request: Request) {
  return withAuth(request, UserRole.ADMIN, async (user) => {
    const body = await request.json()
    
    return NextResponse.json({
      success: true,
      message: `Admin ${user.email} created resource`,
    })
  })
}
```

### Any Authenticated User

```typescript
import { withAuthAny } from '@/lib/auth'

export async function DELETE(request: Request) {
  return withAuthAny(request, async (user) => {
    // Any authenticated user can access
    return NextResponse.json({ 
      success: true,
      userId: user.id 
    })
  })
}
```

## 🔐 JWT Claims Integration

The `requireRole` functions attempt to extract the role from JWT claims first:

1. **Check `user_metadata.role`** - Custom user metadata
2. **Check `app_metadata.role`** - Application metadata
3. **Fallback to database** - Query `ver_profiles` table

This allows roles to be stored in JWT for faster access while maintaining database as source of truth.

## ⚠️ Error Handling

### Server Actions
- Unauthenticated → Redirects to `/login`
- Insufficient role → Throws `AuthenticationError` (can be caught)

### API Routes
- Unauthenticated → Returns `NextResponse` with 401 status
- Insufficient role → Returns `NextResponse` with 403 status
- Use `handleAuthError()` to convert errors to responses

## 🧪 Testing Scenarios

### Test Cases:

1. **Server Action with Admin Role:**
   ```typescript
   const user = await requireRole(UserRole.ADMIN)
   // Should succeed for admin users
   // Should redirect staff/verifier/registrar users
   ```

2. **API Route with Verifier Role:**
   ```typescript
   const user = await requireRoleAPI(UserRole.VERIFIER)
   // Should return 401 for unauthenticated
   // Should return 403 for staff users
   // Should succeed for verifier+ users
   ```

3. **JWT Claims Extraction:**
   - Role in `user_metadata` → Uses JWT claim
   - Role in `app_metadata` → Uses JWT claim
   - No role in JWT → Falls back to database

4. **Role Hierarchy:**
   - Admin accessing staff route → ✅ Allowed
   - Staff accessing admin route → ❌ Forbidden
   - Verifier accessing verifier route → ✅ Allowed

## ✅ Task 2.4 Status: Complete

All requirements have been implemented:
- ✅ `requireRole()` function for server actions and API routes
- ✅ JWT token validation and role extraction from claims
- ✅ Proper error handling for unauthorized access
- ✅ Wrapper functions for common role checks (isStaff, isVerifier, isChiefRegistrar, isAdmin)
- ✅ Works with both server actions and API route handlers
- ✅ Database fallback if role not in JWT
- ✅ Role hierarchy enforcement

The `requireRole` helper is fully functional and ready for use throughout the application.
