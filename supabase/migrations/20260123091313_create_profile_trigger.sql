-- Auto-create ver_profiles record when a user signs up
-- This trigger automatically creates a profile in ver_profiles when a new user is created in auth.users
-- Handles edge cases, user metadata, and maintains data consistency

-- ============================================================================
-- Function to handle new user creation with enhanced error handling
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role_value user_role;
  user_email TEXT;
BEGIN
  -- Extract email (handle NULL case)
  user_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', '');
  
  -- Determine role from user metadata or default to 'staff'
  -- Priority: app_metadata.role > user_metadata.role > default 'staff'
  IF NEW.raw_app_meta_data->>'role' IS NOT NULL THEN
    -- Try to get role from app_metadata
    BEGIN
      user_role_value := (NEW.raw_app_meta_data->>'role')::user_role;
      -- Validate role value
      IF user_role_value NOT IN ('staff', 'verifier', 'chief_registrar', 'admin') THEN
        user_role_value := 'staff'::user_role;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        user_role_value := 'staff'::user_role;
    END;
  ELSIF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    -- Try to get role from user_metadata
    BEGIN
      user_role_value := (NEW.raw_user_meta_data->>'role')::user_role;
      -- Validate role value
      IF user_role_value NOT IN ('staff', 'verifier', 'chief_registrar', 'admin') THEN
        user_role_value := 'staff'::user_role;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        user_role_value := 'staff'::user_role;
    END;
  ELSE
    -- Default to staff role
    user_role_value := 'staff'::user_role;
  END IF;
  
  -- Insert profile with ON CONFLICT handling to prevent duplicate insertions
  -- This handles edge cases where trigger might fire multiple times or profile already exists
  INSERT INTO public.ver_profiles (id, email, role)
  VALUES (
    NEW.id,
    user_email,
    user_role_value
  )
  ON CONFLICT (id) DO UPDATE SET
    -- Update email if it changed (e.g., user updated email in auth)
    email = EXCLUDED.email,
    -- Only update role if it's being upgraded (never downgrade via trigger)
    role = CASE 
      WHEN EXCLUDED.role::text = 'admin' AND ver_profiles.role::text != 'admin' THEN EXCLUDED.role
      WHEN EXCLUDED.role::text = 'chief_registrar' AND ver_profiles.role::text NOT IN ('admin', 'chief_registrar') THEN EXCLUDED.role
      WHEN EXCLUDED.role::text = 'verifier' AND ver_profiles.role::text NOT IN ('admin', 'chief_registrar', 'verifier') THEN EXCLUDED.role
      ELSE ver_profiles.role
    END,
    updated_at = NOW()
  WHERE ver_profiles.id = EXCLUDED.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    -- In production, you might want to log this to a monitoring system
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    -- Still return NEW to allow user creation to proceed
    -- Profile can be created manually later if needed
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Trigger to call the function when a new user is created
-- ============================================================================

-- Drop trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- Optional: Trigger to update profile when user email is updated in auth.users
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update email in ver_profiles if it changed in auth.users
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    UPDATE public.ver_profiles
    SET 
      email = COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', ''),
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.handle_user_update();

-- ============================================================================
-- Permissions and Security
-- ============================================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.ver_profiles TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.ver_profiles TO authenticated;

-- Ensure trigger function has necessary permissions
-- SECURITY DEFINER allows the function to run with the privileges of the function owner
-- This is necessary because the trigger runs in the context of auth schema
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
ALTER FUNCTION public.handle_user_update() OWNER TO postgres;

-- Revoke execute from public (only allow trigger execution)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_user_update() FROM PUBLIC;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON FUNCTION public.handle_new_user() IS 
'Automatically creates a ver_profiles record when a new user signs up via Supabase Auth. 
Handles role assignment from user_metadata or app_metadata, defaults to staff.
Includes ON CONFLICT handling to prevent duplicate insertions.
Maintains data consistency and handles edge cases gracefully.';

COMMENT ON FUNCTION public.handle_user_update() IS 
'Updates ver_profiles when user email is updated in auth.users.
Maintains synchronization between auth.users and ver_profiles tables.';

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 
'Triggers profile creation when a new user is created in auth.users.
Fires AFTER INSERT to ensure user exists before creating profile.';

COMMENT ON TRIGGER on_auth_user_updated ON auth.users IS 
'Triggers profile update when user email changes in auth.users.
Maintains email synchronization between auth and profiles tables.';
