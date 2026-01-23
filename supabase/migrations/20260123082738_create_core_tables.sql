-- Create Core Database Tables with ver_ Prefix
-- This migration creates all required tables for the Records Encryption & Verification system

-- Create custom types/enums
CREATE TYPE user_role AS ENUM ('staff', 'verifier', 'chief_registrar', 'admin');
CREATE TYPE document_status AS ENUM ('pending', 'hashed', 'verified', 'rejected', 'flagged');
CREATE TYPE verification_status AS ENUM ('verified', 'rejected');
CREATE TYPE action_type AS ENUM ('upload', 'hash', 'verify', 'delete', 'export', 'login', 'logout', 'update', 'create');

-- ============================================================================
-- ver_profiles
-- Extends auth.users with application role and metadata
-- ============================================================================
CREATE TABLE ver_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'staff',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for role-based queries
CREATE INDEX idx_ver_profiles_role ON ver_profiles(role);
CREATE INDEX idx_ver_profiles_email ON ver_profiles(email);

-- ============================================================================
-- ver_properties
-- Property registry with PostGIS spatial data
-- ============================================================================
CREATE TABLE ver_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_no TEXT NOT NULL UNIQUE,
    address TEXT NOT NULL,
    geom GEOMETRY(POLYGON, 4326), -- PostGIS geometry column (EPSG:4326 = WGS84)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spatial index for PostGIS queries (GIST)
CREATE INDEX idx_ver_properties_geom ON ver_properties USING GIST(geom);
CREATE INDEX idx_ver_properties_property_no ON ver_properties(property_no);
CREATE INDEX idx_ver_properties_address ON ver_properties(address);

-- ============================================================================
-- ver_documents
-- Canonical document record linked to a property
-- ============================================================================
CREATE TABLE ver_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES ver_properties(id) ON DELETE CASCADE,
    doc_number TEXT NOT NULL,
    uploader_id UUID NOT NULL REFERENCES ver_profiles(id) ON DELETE RESTRICT,
    status document_status NOT NULL DEFAULT 'pending',
    storage_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    original_filename TEXT,
    hash_computed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_doc_number_per_property UNIQUE(property_id, doc_number)
);

-- Indexes for common queries
CREATE INDEX idx_ver_documents_property_id ON ver_documents(property_id);
CREATE INDEX idx_ver_documents_uploader_id ON ver_documents(uploader_id);
CREATE INDEX idx_ver_documents_status ON ver_documents(status);
CREATE INDEX idx_ver_documents_created_at ON ver_documents(created_at);
CREATE INDEX idx_ver_documents_doc_number ON ver_documents(doc_number);

-- ============================================================================
-- ver_document_hashes
-- SHA-256 fingerprints over time (supports re-hash history)
-- ============================================================================
CREATE TABLE ver_document_hashes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES ver_documents(id) ON DELETE CASCADE,
    sha256_hash TEXT NOT NULL,
    algorithm TEXT NOT NULL DEFAULT 'SHA-256',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for hash lookups and document queries
CREATE INDEX idx_ver_document_hashes_document_id ON ver_document_hashes(document_id);
CREATE INDEX idx_ver_document_hashes_hash ON ver_document_hashes(sha256_hash);
CREATE INDEX idx_ver_document_hashes_created_at ON ver_document_hashes(created_at);

-- ============================================================================
-- ver_verifications
-- Verification outcomes and reasons
-- ============================================================================
CREATE TABLE ver_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES ver_documents(id) ON DELETE CASCADE,
    verifier_id UUID NOT NULL REFERENCES ver_profiles(id) ON DELETE RESTRICT,
    status verification_status NOT NULL,
    reason TEXT, -- Required for rejections, optional for verified
    verification_storage_path TEXT, -- Optional storage path for verification file
    discrepancy_metadata JSONB, -- Store file size differences, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for verification queries
CREATE INDEX idx_ver_verifications_document_id ON ver_verifications(document_id);
CREATE INDEX idx_ver_verifications_verifier_id ON ver_verifications(verifier_id);
CREATE INDEX idx_ver_verifications_status ON ver_verifications(status);
CREATE INDEX idx_ver_verifications_created_at ON ver_verifications(created_at);

-- ============================================================================
-- ver_logs
-- Immutable audit trail of all actions
-- ============================================================================
CREATE TABLE ver_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES ver_profiles(id) ON DELETE RESTRICT,
    action action_type NOT NULL,
    target_type TEXT, -- e.g., 'document', 'property', 'verification'
    target_id UUID, -- ID of the target resource
    ip_address INET,
    user_agent TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit log queries
CREATE INDEX idx_ver_logs_actor_id ON ver_logs(actor_id);
CREATE INDEX idx_ver_logs_action ON ver_logs(action);
CREATE INDEX idx_ver_logs_target ON ver_logs(target_type, target_id);
CREATE INDEX idx_ver_logs_created_at ON ver_logs(created_at);
CREATE INDEX idx_ver_logs_details ON ver_logs USING GIN(details); -- GIN index for JSONB queries

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to tables that have updated_at column
CREATE TRIGGER update_ver_profiles_updated_at
    BEFORE UPDATE ON ver_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ver_properties_updated_at
    BEFORE UPDATE ON ver_properties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ver_documents_updated_at
    BEFORE UPDATE ON ver_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to prevent updates/deletes on ver_logs (immutability)
CREATE OR REPLACE FUNCTION prevent_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'ver_logs table is immutable - updates and deletes are not allowed';
END;
$$ LANGUAGE plpgsql;

-- Prevent updates and deletes on ver_logs
CREATE TRIGGER prevent_ver_logs_update
    BEFORE UPDATE ON ver_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_log_modification();

CREATE TRIGGER prevent_ver_logs_delete
    BEFORE DELETE ON ver_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_log_modification();

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE ver_profiles IS 'Extends auth.users with application role and metadata';
COMMENT ON TABLE ver_properties IS 'Property registry with PostGIS spatial data';
COMMENT ON TABLE ver_documents IS 'Canonical document record linked to a property';
COMMENT ON TABLE ver_document_hashes IS 'SHA-256 fingerprints over time (supports re-hash history)';
COMMENT ON TABLE ver_verifications IS 'Verification outcomes and reasons';
COMMENT ON TABLE ver_logs IS 'Immutable audit trail of all actions';

COMMENT ON COLUMN ver_properties.geom IS 'PostGIS geometry column (EPSG:4326 = WGS84)';
COMMENT ON COLUMN ver_document_hashes.sha256_hash IS 'SHA-256 hash of document content';
COMMENT ON COLUMN ver_verifications.reason IS 'Required for rejections, optional for verified';
COMMENT ON COLUMN ver_verifications.discrepancy_metadata IS 'Store file size differences and other discrepancy information';
COMMENT ON COLUMN ver_logs.details IS 'Structured JSONB column for action-specific details';
