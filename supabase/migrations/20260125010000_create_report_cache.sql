-- Report Caching System
-- Implements caching for reports to improve performance

-- ============================================================================
-- Create Report Cache Metadata Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS ver_report_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key TEXT NOT NULL UNIQUE, -- Unique cache key based on report parameters
    report_type TEXT NOT NULL CHECK (report_type IN ('audit-logs', 'verification-reports', 'property-listings')),
    format TEXT NOT NULL CHECK (format IN ('json', 'csv', 'pdf')),
    filters JSONB NOT NULL DEFAULT '{}'::jsonb, -- Report filters
    storage_path TEXT NOT NULL, -- Path in Supabase Storage
    file_size BIGINT NOT NULL, -- Size in bytes
    compressed BOOLEAN NOT NULL DEFAULT false, -- Whether cache is compressed
    record_count INTEGER NOT NULL, -- Number of records in cached report
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL, -- Cache expiration time
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    access_count INTEGER NOT NULL DEFAULT 0, -- Number of times cache was accessed
    CONSTRAINT valid_expiration CHECK (expires_at > created_at)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ver_report_cache_cache_key ON ver_report_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_ver_report_cache_report_type ON ver_report_cache(report_type);
CREATE INDEX IF NOT EXISTS idx_ver_report_cache_expires_at ON ver_report_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ver_report_cache_last_accessed_at ON ver_report_cache(last_accessed_at);

-- ============================================================================
-- Create Report Jobs Table (for background processing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ver_report_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES ver_profiles(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL CHECK (report_type IN ('audit-logs', 'verification-reports', 'property-listings')),
    format TEXT NOT NULL CHECK (format IN ('json', 'csv', 'pdf')),
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100), -- 0-100 percentage
    progress_message TEXT,
    error_message TEXT,
    result_storage_path TEXT, -- Path to generated report in storage
    estimated_completion_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ver_report_jobs_user_id ON ver_report_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ver_report_jobs_status ON ver_report_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ver_report_jobs_created_at ON ver_report_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_ver_report_jobs_pending ON ver_report_jobs(status, created_at) WHERE status = 'pending';

-- ============================================================================
-- Function to Generate Cache Key
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_report_cache_key(
    p_report_type TEXT,
    p_format TEXT,
    p_filters JSONB,
    p_user_id UUID DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
    v_key_parts TEXT[];
    v_key TEXT;
BEGIN
    -- Build cache key from parameters
    v_key_parts := ARRAY[
        p_report_type,
        p_format,
        COALESCE(p_user_id::TEXT, 'all'),
        md5(p_filters::TEXT) -- Hash filters for consistent key
    ];
    
    v_key := array_to_string(v_key_parts, ':');
    
    RETURN v_key;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Function to Clean Expired Cache
-- ============================================================================

CREATE OR REPLACE FUNCTION clean_expired_report_cache()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
    v_expired_records RECORD;
BEGIN
    -- Get expired cache records
    FOR v_expired_records IN
        SELECT id, storage_path
        FROM ver_report_cache
        WHERE expires_at < NOW()
    LOOP
        -- Delete from storage (would need to be done via Edge Function or trigger)
        -- For now, just delete the metadata
        DELETE FROM ver_report_cache WHERE id = v_expired_records.id;
        v_deleted_count := v_deleted_count + 1;
    END LOOP;
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function to Invalidate Cache
-- ============================================================================

CREATE OR REPLACE FUNCTION invalidate_report_cache(
    p_report_type TEXT DEFAULT NULL,
    p_filters JSONB DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_invalidated_count INTEGER;
BEGIN
    -- Invalidate cache based on report type and filters
    IF p_report_type IS NOT NULL THEN
        IF p_filters IS NOT NULL THEN
            -- Invalidate specific cache entries matching filters
            DELETE FROM ver_report_cache
            WHERE report_type = p_report_type
            AND filters @> p_filters; -- JSONB containment operator
        ELSE
            -- Invalidate all cache for report type
            DELETE FROM ver_report_cache
            WHERE report_type = p_report_type;
        END IF;
    ELSE
        -- Invalidate all cache
        DELETE FROM ver_report_cache;
    END IF;
    
    GET DIAGNOSTICS v_invalidated_count = ROW_COUNT;
    
    RETURN v_invalidated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers to Invalidate Cache on Data Changes
-- ============================================================================

-- Invalidate audit logs cache when ver_logs changes
CREATE OR REPLACE FUNCTION invalidate_audit_logs_cache()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM invalidate_report_cache('audit-logs', NULL);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_ver_logs_change_invalidate_cache
    AFTER INSERT OR UPDATE OR DELETE ON ver_logs
    FOR EACH STATEMENT
    EXECUTE FUNCTION invalidate_audit_logs_cache();

-- Invalidate verification reports cache when ver_verifications changes
CREATE OR REPLACE FUNCTION invalidate_verification_reports_cache()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM invalidate_report_cache('verification-reports', NULL);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_ver_verifications_change_invalidate_cache
    AFTER INSERT OR UPDATE OR DELETE ON ver_verifications
    FOR EACH STATEMENT
    EXECUTE FUNCTION invalidate_verification_reports_cache();

-- Invalidate property listings cache when ver_properties changes
CREATE OR REPLACE FUNCTION invalidate_property_listings_cache()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM invalidate_report_cache('property-listings', NULL);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_ver_properties_change_invalidate_cache
    AFTER INSERT OR UPDATE OR DELETE ON ver_properties
    FOR EACH STATEMENT
    EXECUTE FUNCTION invalidate_property_listings_cache();

-- ============================================================================
-- RLS Policies for Report Cache
-- ============================================================================

ALTER TABLE ver_report_cache ENABLE ROW LEVEL SECURITY;

-- Only system can manage cache (via Edge Function with service role)
CREATE POLICY "System can manage cache"
    ON ver_report_cache
    FOR ALL
    USING (true); -- Edge Function uses service role

-- ============================================================================
-- RLS Policies for Report Jobs
-- ============================================================================

ALTER TABLE ver_report_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view their own jobs
CREATE POLICY "Users can view own jobs"
    ON ver_report_jobs
    FOR SELECT
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM ver_profiles
        WHERE id = auth.uid() AND role IN ('chief_registrar', 'admin')
    ));

-- Users can create their own jobs
CREATE POLICY "Users can create own jobs"
    ON ver_report_jobs
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- System can update jobs (via Edge Function)
CREATE POLICY "System can update jobs"
    ON ver_report_jobs
    FOR UPDATE
    USING (true); -- Edge Function uses service role

-- ============================================================================
-- Create Storage Bucket for Report Cache
-- ============================================================================

-- Insert the 'report-cache' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-cache',
  'report-cache',
  false, -- Private bucket
  104857600, -- 100MB file size limit
  ARRAY[
    'application/json',
    'text/csv',
    'text/html',
    'application/pdf',
    'application/gzip',
    'application/x-gzip'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for report cache (system access only)
CREATE POLICY "System can manage report cache"
    ON storage.objects
    FOR ALL
    USING (bucket_id = 'report-cache')
    WITH CHECK (bucket_id = 'report-cache');
