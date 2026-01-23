-- Audit Log Retention and Archival
-- Implements configurable retention policies and archival functionality

-- ============================================================================
-- Create Archive Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS ver_logs_archive (
    id UUID PRIMARY KEY,
    actor_id UUID NOT NULL,
    action action_type NOT NULL,
    target_type TEXT,
    target_id UUID,
    ip_address INET,
    user_agent TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for archive table
CREATE INDEX IF NOT EXISTS idx_ver_logs_archive_actor_id ON ver_logs_archive(actor_id);
CREATE INDEX IF NOT EXISTS idx_ver_logs_archive_action ON ver_logs_archive(action);
CREATE INDEX IF NOT EXISTS idx_ver_logs_archive_created_at ON ver_logs_archive(created_at);
CREATE INDEX IF NOT EXISTS idx_ver_logs_archive_archived_at ON ver_logs_archive(archived_at);
CREATE INDEX IF NOT EXISTS idx_ver_logs_archive_target ON ver_logs_archive(target_type, target_id);

-- ============================================================================
-- Retention Policy Configuration Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS ver_audit_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type action_type,
    retention_days INTEGER NOT NULL DEFAULT 365,
    archive_before_delete BOOLEAN NOT NULL DEFAULT true,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_action_type UNIQUE(action_type)
);

-- Default retention policies (365 days for all actions)
INSERT INTO ver_audit_retention_policies (action_type, retention_days, archive_before_delete, enabled)
VALUES
    (NULL, 365, true, true), -- Default policy for all actions
    ('login', 90, true, true), -- Shorter retention for login/logout
    ('logout', 90, true, true),
    ('export', 180, true, true) -- Medium retention for exports
ON CONFLICT (action_type) DO NOTHING;

-- ============================================================================
-- Function to Get Retention Period for Action
-- ============================================================================

CREATE OR REPLACE FUNCTION get_retention_period(p_action action_type)
RETURNS INTEGER AS $$
DECLARE
    retention_days INTEGER;
BEGIN
    -- First try to get action-specific policy
    SELECT retention_days INTO retention_days
    FROM ver_audit_retention_policies
    WHERE action_type = p_action AND enabled = true;

    -- If no action-specific policy, use default
    IF retention_days IS NULL THEN
        SELECT retention_days INTO retention_days
        FROM ver_audit_retention_policies
        WHERE action_type IS NULL AND enabled = true;
    END IF;

    -- Default to 365 days if no policy found
    RETURN COALESCE(retention_days, 365);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Function to Archive Old Audit Logs
-- ============================================================================

CREATE OR REPLACE FUNCTION archive_old_audit_logs()
RETURNS TABLE(archived_count INTEGER, deleted_count INTEGER) AS $$
DECLARE
    archived_count INTEGER := 0;
    deleted_count INTEGER := 0;
    log_record RECORD;
    retention_days INTEGER;
    archive_before_delete BOOLEAN;
    cutoff_date TIMESTAMPTZ;
BEGIN
    -- Process each action type
    FOR log_record IN
        SELECT DISTINCT action FROM ver_logs
    LOOP
        -- Get retention policy for this action
        SELECT get_retention_period(log_record.action), 
               COALESCE((SELECT archive_before_delete FROM ver_audit_retention_policies 
                        WHERE action_type = log_record.action AND enabled = true 
                        LIMIT 1),
                       (SELECT archive_before_delete FROM ver_audit_retention_policies 
                        WHERE action_type IS NULL AND enabled = true 
                        LIMIT 1),
                       true)
        INTO retention_days, archive_before_delete;

        -- Calculate cutoff date
        cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;

        -- Archive logs older than retention period
        IF archive_before_delete THEN
            WITH archived AS (
                INSERT INTO ver_logs_archive (
                    id, actor_id, action, target_type, target_id,
                    ip_address, user_agent, details, created_at, archived_at
                )
                SELECT 
                    id, actor_id, action, target_type, target_id,
                    ip_address, user_agent, details, created_at, NOW()
                FROM ver_logs
                WHERE action = log_record.action
                  AND created_at < cutoff_date
                RETURNING id
            )
            SELECT COUNT(*) INTO archived_count FROM archived;

            -- Delete archived logs
            DELETE FROM ver_logs
            WHERE action = log_record.action
              AND created_at < cutoff_date;

            deleted_count := deleted_count + archived_count;
        ELSE
            -- Delete without archiving
            WITH deleted AS (
                DELETE FROM ver_logs
                WHERE action = log_record.action
                  AND created_at < cutoff_date
                RETURNING id
            )
            SELECT COUNT(*) INTO deleted_count FROM deleted;
        END IF;
    END LOOP;

    RETURN QUERY SELECT archived_count, deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function to Archive Logs by Action Type
-- ============================================================================

CREATE OR REPLACE FUNCTION archive_audit_logs_by_action(
    p_action action_type,
    p_retention_days INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    retention_days INTEGER;
    archive_before_delete BOOLEAN;
    cutoff_date TIMESTAMPTZ;
    archived_count INTEGER;
BEGIN
    -- Get retention policy
    retention_days := COALESCE(p_retention_days, get_retention_period(p_action));
    
    SELECT COALESCE((SELECT archive_before_delete FROM ver_audit_retention_policies 
                    WHERE action_type = p_action AND enabled = true 
                    LIMIT 1),
                   (SELECT archive_before_delete FROM ver_audit_retention_policies 
                    WHERE action_type IS NULL AND enabled = true 
                    LIMIT 1),
                   true)
    INTO archive_before_delete;

    -- Calculate cutoff date
    cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;

    -- Archive logs
    IF archive_before_delete THEN
        WITH archived AS (
            INSERT INTO ver_logs_archive (
                id, actor_id, action, target_type, target_id,
                ip_address, user_agent, details, created_at, archived_at
            )
            SELECT 
                id, actor_id, action, target_type, target_id,
                ip_address, user_agent, details, created_at, NOW()
            FROM ver_logs
            WHERE action = p_action
              AND created_at < cutoff_date
            RETURNING id
        )
        SELECT COUNT(*) INTO archived_count FROM archived;

        -- Delete archived logs
        DELETE FROM ver_logs
        WHERE action = p_action
          AND created_at < cutoff_date;

        RETURN archived_count;
    ELSE
        -- Delete without archiving
        WITH deleted AS (
            DELETE FROM ver_logs
            WHERE action = p_action
              AND created_at < cutoff_date
            RETURNING id
        )
        SELECT COUNT(*) INTO archived_count FROM deleted;
        
        RETURN archived_count;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE ver_logs_archive IS 'Archived audit logs moved from ver_logs table based on retention policies';
COMMENT ON TABLE ver_audit_retention_policies IS 'Configurable retention policies for audit logs by action type';
COMMENT ON FUNCTION get_retention_period(action_type) IS 'Gets the retention period in days for a specific action type';
COMMENT ON FUNCTION archive_old_audit_logs() IS 'Archives and deletes old audit logs based on retention policies';
COMMENT ON FUNCTION archive_audit_logs_by_action(action_type, INTEGER) IS 'Archives and deletes audit logs for a specific action type';

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Allow service role to manage retention policies
GRANT SELECT, INSERT, UPDATE, DELETE ON ver_audit_retention_policies TO service_role;
GRANT SELECT, INSERT ON ver_logs_archive TO service_role;
GRANT EXECUTE ON FUNCTION get_retention_period(action_type) TO service_role;
GRANT EXECUTE ON FUNCTION archive_old_audit_logs() TO service_role;
GRANT EXECUTE ON FUNCTION archive_audit_logs_by_action(action_type, INTEGER) TO service_role;

-- Allow admin users to view retention policies
GRANT SELECT ON ver_audit_retention_policies TO authenticated;
GRANT SELECT ON ver_logs_archive TO authenticated;
