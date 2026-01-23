-- Enhance Audit Logs Table with Immutability Constraints and Triggers
-- Adds constraints and triggers to prevent updates/deletes on ver_logs table

-- ============================================================================
-- Update action_type enum if needed (add missing values)
-- ============================================================================

-- Check if enum values exist, add if missing
DO $$
BEGIN
  -- Add 'login' if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'login' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'action_type')
  ) THEN
    ALTER TYPE action_type ADD VALUE 'login';
  END IF;

  -- Add 'logout' if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'logout' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'action_type')
  ) THEN
    ALTER TYPE action_type ADD VALUE 'logout';
  END IF;
END $$;

-- ============================================================================
-- Add Immutability Constraints
-- ============================================================================

-- Prevent updates on ver_logs table
CREATE OR REPLACE FUNCTION prevent_ver_logs_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ver_logs table is immutable: updates are not allowed'
    USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Prevent deletes on ver_logs table
CREATE OR REPLACE FUNCTION prevent_ver_logs_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ver_logs table is immutable: deletes are not allowed'
    USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to enforce immutability
DROP TRIGGER IF EXISTS prevent_ver_logs_update_trigger ON ver_logs;
CREATE TRIGGER prevent_ver_logs_update_trigger
  BEFORE UPDATE ON ver_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_ver_logs_update();

DROP TRIGGER IF EXISTS prevent_ver_logs_delete_trigger ON ver_logs;
CREATE TRIGGER prevent_ver_logs_delete_trigger
  BEFORE DELETE ON ver_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_ver_logs_delete();

-- ============================================================================
-- Add Additional Indexes for Efficient Querying
-- ============================================================================

-- Composite index for actor_id and created_at (user activity timeline)
CREATE INDEX IF NOT EXISTS idx_ver_logs_actor_created_at 
  ON ver_logs(actor_id, created_at DESC);

-- Composite index for action_type and created_at (time-based audit queries)
CREATE INDEX IF NOT EXISTS idx_ver_logs_action_created_at 
  ON ver_logs(action, created_at DESC);

-- Composite index for target_type, target_id, and created_at (resource activity)
CREATE INDEX IF NOT EXISTS idx_ver_logs_target_created_at 
  ON ver_logs(target_type, target_id, created_at DESC);

-- Index for recent logs - improves query performance for time-based queries
-- Note: Cannot use NOW() in partial index predicate (not IMMUTABLE)
-- Instead, we rely on the regular index on created_at which PostgreSQL will use efficiently
-- with WHERE clauses that include date ranges
CREATE INDEX IF NOT EXISTS idx_ver_logs_created_at 
  ON ver_logs(created_at DESC);

-- Index for IP address queries (security/forensics)
CREATE INDEX IF NOT EXISTS idx_ver_logs_ip_address 
  ON ver_logs(ip_address)
  WHERE ip_address IS NOT NULL;

-- ============================================================================
-- Add Check Constraints
-- ============================================================================

-- Ensure details is always a JSONB object (not null, not array, not primitive)
ALTER TABLE ver_logs 
  ADD CONSTRAINT check_details_is_object 
  CHECK (jsonb_typeof(details) = 'object');

-- Ensure created_at is not in the future
ALTER TABLE ver_logs 
  ADD CONSTRAINT check_created_at_not_future 
  CHECK (created_at <= NOW() + INTERVAL '1 minute');

-- ============================================================================
-- Add Comments for Documentation
-- ============================================================================

COMMENT ON TABLE ver_logs IS 'Immutable audit trail of all user actions. Updates and deletes are prevented by triggers.';
COMMENT ON COLUMN ver_logs.id IS 'Unique identifier for the audit log entry';
COMMENT ON COLUMN ver_logs.actor_id IS 'User who performed the action (references ver_profiles.id)';
COMMENT ON COLUMN ver_logs.action IS 'Type of action performed (upload, hash, verify, delete, export, login, logout, update, create)';
COMMENT ON COLUMN ver_logs.target_type IS 'Type of resource affected (e.g., document, property, verification)';
COMMENT ON COLUMN ver_logs.target_id IS 'ID of the resource affected by the action';
COMMENT ON COLUMN ver_logs.ip_address IS 'IP address of the client that initiated the action';
COMMENT ON COLUMN ver_logs.user_agent IS 'User agent string of the client that initiated the action';
COMMENT ON COLUMN ver_logs.details IS 'Structured JSONB object containing action-specific details';
COMMENT ON COLUMN ver_logs.created_at IS 'Timestamp when the action occurred (immutable)';

COMMENT ON FUNCTION prevent_ver_logs_update() IS 'Prevents updates to ver_logs table to ensure immutability';
COMMENT ON FUNCTION prevent_ver_logs_delete() IS 'Prevents deletes from ver_logs table to ensure immutability';

COMMENT ON INDEX idx_ver_logs_actor_created_at IS 'Optimizes queries for user activity timeline';
COMMENT ON INDEX idx_ver_logs_action_created_at IS 'Optimizes time-based audit queries by action type';
COMMENT ON INDEX idx_ver_logs_target_created_at IS 'Optimizes queries for resource activity history';
COMMENT ON INDEX idx_ver_logs_created_at IS 'Optimizes queries for time-based audit log queries, including recent logs';
COMMENT ON INDEX idx_ver_logs_ip_address IS 'Optimizes security/forensics queries by IP address';

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Ensure service role can insert (for triggers and Edge Functions)
GRANT INSERT ON ver_logs TO service_role;

-- Ensure authenticated users with appropriate roles can read (via RLS policies)
-- RLS policies are already defined in create_rls_policies.sql
