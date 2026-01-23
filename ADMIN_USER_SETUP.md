# Admin User Setup Guide

## Admin User Details

- **ID**: `457506a0-93cd-40f5-bad4-2047665812b5`
- **Email**: `admin@apr.local`
- **Password**: `smarthubtech2050`
- **Role**: `admin` (super system administrator)

## Setup Instructions

### Option 1: Apply Migration (Recommended)

```bash
cd /home/sbhunu/production/ver
supabase migration up
```

This will apply the migration `20260125020000_setup_admin_user.sql` which ensures the admin user profile exists in `ver_profiles` with the correct role.

### Option 2: Run SQL Directly

If you prefer to run the SQL directly:

```bash
# Using psql
psql -h localhost -U postgres -d postgres -f supabase/tests/setup_admin_user.sql

# Or via Supabase Dashboard SQL Editor
# Copy and paste the INSERT statement from:
# supabase/migrations/20260125020000_setup_admin_user.sql
```

### Option 3: Manual SQL Execution

Execute this SQL in your database:

```sql
INSERT INTO public.ver_profiles (id, email, role, created_at, updated_at)
VALUES (
  '457506a0-93cd-40f5-bad4-2047665812b5'::UUID,
  'admin@apr.local',
  'admin'::user_role,
  '2025-12-26 02:42:33.735275+00'::TIMESTAMPTZ,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = 'admin'::user_role,
  updated_at = NOW()
WHERE ver_profiles.id = EXCLUDED.id;
```

## Verification

After running the setup, verify the admin user:

```sql
SELECT id, email, role, created_at, updated_at
FROM public.ver_profiles
WHERE id = '457506a0-93cd-40f5-bad4-2047665812b5'::UUID;
```

Expected result:
- `id`: `457506a0-93cd-40f5-bad4-2047665812b5`
- `email`: `admin@apr.local`
- `role`: `admin`
- `created_at`: `2025-12-26 02:42:33.735275+00`
- `updated_at`: Current timestamp

## Login

Once the profile is set up, the admin user can login at:

**URL**: `http://localhost:3000/login`

**Credentials**:
- Email: `admin@apr.local`
- Password: `smarthubtech2050`

After successful login, the admin will be redirected to the admin dashboard at `/dashboard/admin`.

## Admin User Permissions

As a super system administrator with `admin` role, this user has access to:

1. **Admin Dashboard** (`/dashboard/admin`)
   - User Management
   - System Configuration
   - System Health Monitoring
   - Audit Logs Viewer

2. **All Other Dashboards** (via role hierarchy)
   - Chief Registrar Dashboard
   - Verifier Dashboard
   - Staff Dashboard

3. **All System Features**
   - Document upload and management
   - Document verification
   - Property management
   - GIS mapping
   - Report generation
   - Audit log viewing

4. **System Administration**
   - User role management
   - System configuration
   - Retention policy management
   - System health monitoring

## Notes

- The user already exists in `auth.users` table (Supabase Auth)
- This setup ensures the user also exists in `ver_profiles` with the correct role
- The password is stored in Supabase Auth and cannot be changed via this migration
- If you need to reset the password, use Supabase Auth Admin API or Dashboard

## Troubleshooting

If login fails:

1. Verify the user exists in `auth.users`:
   ```sql
   SELECT id, email, confirmed_at FROM auth.users 
   WHERE id = '457506a0-93cd-40f5-bad4-2047665812b5'::UUID;
   ```

2. Verify the profile exists in `ver_profiles`:
   ```sql
   SELECT * FROM public.ver_profiles 
   WHERE id = '457506a0-93cd-40f5-bad4-2047665812b5'::UUID;
   ```

3. Check that the role is set to `admin`:
   ```sql
   SELECT role FROM public.ver_profiles 
   WHERE id = '457506a0-93cd-40f5-bad4-2047665812b5'::UUID;
   ```

4. Verify RLS policies allow access:
   - Admin users should have access to all tables via RLS policies
   - Check `supabase/migrations/20260123083210_create_rls_policies.sql` for policy details
