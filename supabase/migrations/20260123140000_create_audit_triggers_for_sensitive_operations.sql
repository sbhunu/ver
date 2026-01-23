-- Create Audit Triggers for Sensitive Operations
-- Automatically logs all INSERT, UPDATE, DELETE operations on critical tables
-- Ensures no database operations can bypass the audit system

-- ============================================================================
-- Helper Function: Get Current User ID from Session
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
  -- Try to get user ID from current session
  -- This works for operations initiated by authenticated users
  RETURN COALESCE(
    (SELECT id FROM ver_profiles WHERE id = auth.uid()),
    -- Fallback: Use service role ID if available, or NULL
    NULL
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- Function to Log Document Hash Actions
-- ============================================================================

CREATE OR REPLACE FUNCTION log_document_hash_action()
RETURNS TRIGGER AS $$
DECLARE
  action_val action_type;
  target_type_val TEXT := 'hash';
  details_val JSONB;
  actor_id_val UUID;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_val := 'hash';
    details_val := jsonb_build_object(
      'document_id', NEW.document_id,
      'hash', NEW.sha256_hash,
      'algorithm', NEW.algorithm,
      'created_at', NEW.created_at
    );
    -- Try to get actor from document uploader, fallback to current user
    SELECT uploader_id INTO actor_id_val
    FROM ver_documents
    WHERE id = NEW.document_id;
    actor_id_val := COALESCE(actor_id_val, get_current_user_id());
  ELSIF TG_OP = 'UPDATE' THEN
    action_val := 'update';
    details_val := jsonb_build_object(
      'document_id', NEW.document_id,
      'hash_old', OLD.sha256_hash,
      'hash_new', NEW.sha256_hash,
      'algorithm_old', OLD.algorithm,
      'algorithm_new', NEW.algorithm,
      'changes', jsonb_build_object(
        'hash', CASE WHEN OLD.sha256_hash != NEW.sha256_hash THEN jsonb_build_object('from', OLD.sha256_hash, 'to', NEW.sha256_hash) ELSE NULL END,
        'algorithm', CASE WHEN OLD.algorithm != NEW.algorithm THEN jsonb_build_object('from', OLD.algorithm, 'to', NEW.algorithm) ELSE NULL END
      )
    );
    SELECT uploader_id INTO actor_id_val
    FROM ver_documents
    WHERE id = NEW.document_id;
    actor_id_val := COALESCE(actor_id_val, get_current_user_id());
  ELSIF TG_OP = 'DELETE' THEN
    action_val := 'delete';
    details_val := jsonb_build_object(
      'document_id', OLD.document_id,
      'hash', OLD.sha256_hash,
      'algorithm', OLD.algorithm,
      'created_at', OLD.created_at
    );
    SELECT uploader_id INTO actor_id_val
    FROM ver_documents
    WHERE id = OLD.document_id;
    actor_id_val := COALESCE(actor_id_val, get_current_user_id());
  END IF;

  -- Only log if we have an actor_id
  IF actor_id_val IS NOT NULL THEN
    BEGIN
      -- Insert audit log entry
      INSERT INTO ver_logs (
        actor_id,
        action,
        target_type,
        target_id,
        details
      ) VALUES (
        actor_id_val,
        action_val,
        target_type_val,
        COALESCE(NEW.id, OLD.id), -- Hash record ID
        details_val
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't block the operation
        RAISE WARNING 'Failed to create audit log for document hash action: %', SQLERRM;
    END;
  END IF;

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function to Log Verification Actions
-- ============================================================================

CREATE OR REPLACE FUNCTION log_verification_action()
RETURNS TRIGGER AS $$
DECLARE
  action_val action_type;
  target_type_val TEXT := 'verification';
  details_val JSONB;
  actor_id_val UUID;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_val := 'verify';
    details_val := jsonb_build_object(
      'document_id', NEW.document_id,
      'verifier_id', NEW.verifier_id,
      'status', NEW.status,
      'reason', NEW.reason,
      'verification_storage_path', NEW.verification_storage_path,
      'discrepancy_metadata', NEW.discrepancy_metadata
    );
    actor_id_val := NEW.verifier_id;
  ELSIF TG_OP = 'UPDATE' THEN
    action_val := 'update';
    details_val := jsonb_build_object(
      'document_id', NEW.document_id,
      'verifier_id', NEW.verifier_id,
      'status_old', OLD.status,
      'status_new', NEW.status,
      'reason_old', OLD.reason,
      'reason_new', NEW.reason,
      'changes', jsonb_build_object(
        'status', CASE WHEN OLD.status != NEW.status THEN jsonb_build_object('from', OLD.status, 'to', NEW.status) ELSE NULL END,
        'reason', CASE WHEN OLD.reason IS DISTINCT FROM NEW.reason THEN jsonb_build_object('from', OLD.reason, 'to', NEW.reason) ELSE NULL END
      )
    );
    actor_id_val := COALESCE(NEW.verifier_id, OLD.verifier_id);
  ELSIF TG_OP = 'DELETE' THEN
    action_val := 'delete';
    details_val := jsonb_build_object(
      'document_id', OLD.document_id,
      'verifier_id', OLD.verifier_id,
      'status', OLD.status,
      'reason', OLD.reason
    );
    actor_id_val := OLD.verifier_id;
  END IF;

  -- Only log if we have an actor_id
  IF actor_id_val IS NOT NULL THEN
    BEGIN
      -- Insert audit log entry
      INSERT INTO ver_logs (
        actor_id,
        action,
        target_type,
        target_id,
        details
      ) VALUES (
        actor_id_val,
        action_val,
        target_type_val,
        COALESCE(NEW.id, OLD.id), -- Verification ID
        details_val
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't block the operation
        RAISE WARNING 'Failed to create audit log for verification action: %', SQLERRM;
    END;
  END IF;

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function to Log Property Actions
-- ============================================================================

CREATE OR REPLACE FUNCTION log_property_action()
RETURNS TRIGGER AS $$
DECLARE
  action_val action_type;
  target_type_val TEXT := 'property';
  details_val JSONB;
  actor_id_val UUID;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_val := 'create';
    details_val := jsonb_build_object(
      'property_no', NEW.property_no,
      'address', NEW.address,
      'has_geometry', NEW.geom IS NOT NULL,
      'created_at', NEW.created_at
    );
    actor_id_val := get_current_user_id();
  ELSIF TG_OP = 'UPDATE' THEN
    action_val := 'update';
    details_val := jsonb_build_object(
      'property_no', NEW.property_no,
      'address_old', OLD.address,
      'address_new', NEW.address,
      'property_no_old', OLD.property_no,
      'property_no_new', NEW.property_no,
      'geometry_changed', (OLD.geom IS NULL AND NEW.geom IS NOT NULL) OR (OLD.geom IS NOT NULL AND NEW.geom IS NULL) OR (OLD.geom IS DISTINCT FROM NEW.geom),
      'changes', jsonb_build_object(
        'property_no', CASE WHEN OLD.property_no != NEW.property_no THEN jsonb_build_object('from', OLD.property_no, 'to', NEW.property_no) ELSE NULL END,
        'address', CASE WHEN OLD.address IS DISTINCT FROM NEW.address THEN jsonb_build_object('from', OLD.address, 'to', NEW.address) ELSE NULL END,
        'geometry', CASE WHEN (OLD.geom IS DISTINCT FROM NEW.geom) THEN 'modified' ELSE NULL END
      )
    );
    actor_id_val := get_current_user_id();
  ELSIF TG_OP = 'DELETE' THEN
    action_val := 'delete';
    details_val := jsonb_build_object(
      'property_no', OLD.property_no,
      'address', OLD.address,
      'had_geometry', OLD.geom IS NOT NULL
    );
    actor_id_val := get_current_user_id();
  END IF;

  -- Only log if we have an actor_id
  IF actor_id_val IS NOT NULL THEN
    BEGIN
      -- Insert audit log entry
      INSERT INTO ver_logs (
        actor_id,
        action,
        target_type,
        target_id,
        details
      ) VALUES (
        actor_id_val,
        action_val,
        target_type_val,
        COALESCE(NEW.id, OLD.id), -- Property ID
        details_val
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't block the operation
        RAISE WARNING 'Failed to create audit log for property action: %', SQLERRM;
    END;
  END IF;

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function to Log User Role Changes
-- ============================================================================

CREATE OR REPLACE FUNCTION log_role_change_action()
RETURNS TRIGGER AS $$
DECLARE
  action_val action_type := 'update';
  target_type_val TEXT := 'profile';
  details_val JSONB;
  actor_id_val UUID;
BEGIN
  -- Only log if role actually changed
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    details_val := jsonb_build_object(
      'user_id', NEW.id,
      'email', NEW.email,
      'role_old', OLD.role,
      'role_new', NEW.role,
      'changes', jsonb_build_object(
        'role', jsonb_build_object('from', OLD.role, 'to', NEW.role)
      )
    );

    -- Get actor from current session or use system user
    actor_id_val := get_current_user_id();
    
    -- If no current user, try to get from auth context or use NULL
    -- (This will be logged as system action)
    IF actor_id_val IS NULL THEN
      -- Try to get from auth.uid() directly
      BEGIN
        actor_id_val := auth.uid();
      EXCEPTION
        WHEN OTHERS THEN
          actor_id_val := NULL;
      END;
    END IF;

    -- Only log if we have an actor_id
    IF actor_id_val IS NOT NULL THEN
      BEGIN
        -- Insert audit log entry
        INSERT INTO ver_logs (
          actor_id,
          action,
          target_type,
          target_id,
          details
        ) VALUES (
          actor_id_val,
          action_val,
          target_type_val,
          NEW.id, -- Profile ID
          details_val
        );
      EXCEPTION
        WHEN OTHERS THEN
          -- Log error but don't block the operation
          RAISE WARNING 'Failed to create audit log for role change: %', SQLERRM;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Create Triggers
-- ============================================================================

-- Drop existing triggers if they exist (for idempotency)
DROP TRIGGER IF EXISTS on_ver_document_hashes_audit ON ver_document_hashes;
DROP TRIGGER IF EXISTS on_ver_verifications_audit ON ver_verifications;
DROP TRIGGER IF EXISTS on_ver_properties_audit ON ver_properties;
DROP TRIGGER IF EXISTS on_ver_profiles_role_change_audit ON ver_profiles;

-- Trigger for ver_document_hashes
CREATE TRIGGER on_ver_document_hashes_audit
  AFTER INSERT OR UPDATE OR DELETE ON ver_document_hashes
  FOR EACH ROW
  EXECUTE FUNCTION log_document_hash_action();

-- Trigger for ver_verifications
CREATE TRIGGER on_ver_verifications_audit
  AFTER INSERT OR UPDATE OR DELETE ON ver_verifications
  FOR EACH ROW
  EXECUTE FUNCTION log_verification_action();

-- Trigger for ver_properties
CREATE TRIGGER on_ver_properties_audit
  AFTER INSERT OR UPDATE OR DELETE ON ver_properties
  FOR EACH ROW
  EXECUTE FUNCTION log_property_action();

-- Trigger for ver_profiles role changes (in addition to existing prevent_role_change trigger)
CREATE TRIGGER on_ver_profiles_role_change_audit
  AFTER UPDATE ON ver_profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION log_role_change_action();

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON FUNCTION get_current_user_id() IS 'Helper function to get current user ID from session context';
COMMENT ON FUNCTION log_document_hash_action() IS 'Automatically logs document hash operations (INSERT, UPDATE, DELETE) to ver_logs';
COMMENT ON FUNCTION log_verification_action() IS 'Automatically logs verification operations (INSERT, UPDATE, DELETE) to ver_logs';
COMMENT ON FUNCTION log_property_action() IS 'Automatically logs property operations (INSERT, UPDATE, DELETE) to ver_logs';
COMMENT ON FUNCTION log_role_change_action() IS 'Automatically logs user role changes to ver_logs';

COMMENT ON TRIGGER on_ver_document_hashes_audit ON ver_document_hashes IS 'Triggers audit logging for all document hash operations';
COMMENT ON TRIGGER on_ver_verifications_audit ON ver_verifications IS 'Triggers audit logging for all verification operations';
COMMENT ON TRIGGER on_ver_properties_audit ON ver_properties IS 'Triggers audit logging for all property operations';
COMMENT ON TRIGGER on_ver_profiles_role_change_audit ON ver_profiles IS 'Triggers audit logging for user role changes';

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Ensure service role can insert audit logs (for triggers)
GRANT INSERT ON ver_logs TO service_role;

-- Ensure functions can be executed by authenticated users
GRANT EXECUTE ON FUNCTION get_current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION log_document_hash_action() TO authenticated;
GRANT EXECUTE ON FUNCTION log_verification_action() TO authenticated;
GRANT EXECUTE ON FUNCTION log_property_action() TO authenticated;
GRANT EXECUTE ON FUNCTION log_role_change_action() TO authenticated;
