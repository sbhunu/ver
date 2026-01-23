-- Direct SQL Script to Setup Admin User
-- Run this script directly in your database to ensure admin user is configured
-- This is a convenience script - the migration will also handle this

-- ============================================================================
-- Setup Admin User Profile
-- ============================================================================

-- Insert or update the admin user profile
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
  role = 'admin'::user_role, -- Ensure role is admin
  updated_at = NOW()
WHERE ver_profiles.id = EXCLUDED.id;

-- ============================================================================
-- Verify Setup
-- ============================================================================

-- Check if admin user exists in auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = '457506a0-93cd-40f5-bad4-2047665812b5'::UUID
  ) THEN
    RAISE NOTICE 'WARNING: Admin user does not exist in auth.users. Please ensure the user is created in Supabase Auth first.';
  ELSE
    RAISE NOTICE '✓ Admin user exists in auth.users';
  END IF;
END $$;

-- Check if profile was created/updated
DO $$
DECLARE
  profile_role user_role;
  profile_email TEXT;
BEGIN
  SELECT role, email INTO profile_role, profile_email
  FROM public.ver_profiles
  WHERE id = '457506a0-93cd-40f5-bad4-2047665812b5'::UUID;

  IF profile_role IS NULL THEN
    RAISE NOTICE 'ERROR: Admin profile was not created/updated';
  ELSIF profile_role != 'admin'::user_role THEN
    RAISE NOTICE 'WARNING: Admin profile exists but role is %, expected admin', profile_role;
  ELSIF profile_email != 'admin@apr.local' THEN
    RAISE NOTICE 'WARNING: Admin profile email is %, expected admin@apr.local', profile_email;
  ELSE
    RAISE NOTICE '✓ Admin profile exists with correct role (admin) and email (admin@apr.local)';
  END IF;
END $$;

-- Display final status
SELECT 
  'Admin User Setup Complete' as status,
  id,
  email,
  role,
  created_at,
  updated_at
FROM public.ver_profiles
WHERE id = '457506a0-93cd-40f5-bad4-2047665812b5'::UUID;
