-- Setup Admin User Profile
-- Ensures the super system administrator user exists in ver_profiles with admin role
-- This migration handles the case where the user already exists in auth.users

-- ============================================================================
-- Ensure Admin User Profile Exists
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
-- Verify Admin User Setup
-- ============================================================================

-- Create a function to verify the admin user exists and has correct role
CREATE OR REPLACE FUNCTION verify_admin_user_setup()
RETURNS TABLE(
  user_exists BOOLEAN,
  profile_exists BOOLEAN,
  has_admin_role BOOLEAN,
  email_match BOOLEAN
) AS $$
DECLARE
  auth_user_exists BOOLEAN;
  profile_record RECORD;
BEGIN
  -- Check if user exists in auth.users
  SELECT EXISTS(
    SELECT 1 FROM auth.users 
    WHERE id = '457506a0-93cd-40f5-bad4-2047665812b5'::UUID
  ) INTO auth_user_exists;

  -- Get profile record
  SELECT * INTO profile_record
  FROM public.ver_profiles
  WHERE id = '457506a0-93cd-40f5-bad4-2047665812b5'::UUID;

  RETURN QUERY SELECT
    auth_user_exists,
    (profile_record.id IS NOT NULL),
    (profile_record.role = 'admin'::user_role),
    (profile_record.email = 'admin@apr.local');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Ensure the admin user profile has proper permissions
-- (RLS policies should already handle this, but we ensure the record exists)

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION verify_admin_user_setup() IS 
'Verifies that the admin user exists in both auth.users and ver_profiles with correct role and email.
Returns a table with verification results.';
