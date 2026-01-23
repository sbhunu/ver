-- Performance Indexes and Spatial Indexing
-- Add composite indexes for common query patterns to optimize performance

-- ============================================================================
-- Composite Indexes for ver_documents
-- ============================================================================

-- Index for filtering documents by property and status (common dashboard query)
CREATE INDEX IF NOT EXISTS idx_ver_documents_property_status 
    ON ver_documents(property_id, status);

-- Index for filtering documents by uploader and status (staff dashboard)
CREATE INDEX IF NOT EXISTS idx_ver_documents_uploader_status 
    ON ver_documents(uploader_id, status);

-- Index for filtering documents by status and creation date (recent documents by status)
CREATE INDEX IF NOT EXISTS idx_ver_documents_status_created 
    ON ver_documents(status, created_at DESC);

-- Index for filtering documents by uploader and creation date (staff upload history)
CREATE INDEX IF NOT EXISTS idx_ver_documents_uploader_created 
    ON ver_documents(uploader_id, created_at DESC);

-- Index for property and creation date (recent documents per property)
CREATE INDEX IF NOT EXISTS idx_ver_documents_property_created 
    ON ver_documents(property_id, created_at DESC);

-- ============================================================================
-- Composite Indexes for ver_verifications
-- ============================================================================

-- Index for filtering verifications by document and status
CREATE INDEX IF NOT EXISTS idx_ver_verifications_document_status 
    ON ver_verifications(document_id, status);

-- Index for filtering verifications by verifier and creation date (verifier history)
CREATE INDEX IF NOT EXISTS idx_ver_verifications_verifier_created 
    ON ver_verifications(verifier_id, created_at DESC);

-- Index for filtering verifications by status and creation date (analytics)
CREATE INDEX IF NOT EXISTS idx_ver_verifications_status_created 
    ON ver_verifications(status, created_at DESC);

-- Index for document and creation date (verification history per document)
CREATE INDEX IF NOT EXISTS idx_ver_verifications_document_created 
    ON ver_verifications(document_id, created_at DESC);

-- ============================================================================
-- Composite Indexes for ver_logs
-- ============================================================================

-- Index for filtering logs by actor and action (user activity tracking)
CREATE INDEX IF NOT EXISTS idx_ver_logs_actor_action 
    ON ver_logs(actor_id, action);

-- Index for filtering logs by action and creation date (time-based audit queries)
CREATE INDEX IF NOT EXISTS idx_ver_logs_action_created 
    ON ver_logs(action, created_at DESC);

-- Index for filtering logs by actor and creation date (user activity timeline)
CREATE INDEX IF NOT EXISTS idx_ver_logs_actor_created 
    ON ver_logs(actor_id, created_at DESC);

-- Index for filtering logs by target type and target id (resource activity)
CREATE INDEX IF NOT EXISTS idx_ver_logs_target_created 
    ON ver_logs(target_type, target_id, created_at DESC);

-- ============================================================================
-- Composite Indexes for ver_document_hashes
-- ============================================================================

-- Index for filtering hashes by document and creation date (hash history)
CREATE INDEX IF NOT EXISTS idx_ver_document_hashes_document_created 
    ON ver_document_hashes(document_id, created_at DESC);

-- ============================================================================
-- Composite Indexes for ver_properties
-- ============================================================================

-- Index for filtering properties by creation date (recent properties)
CREATE INDEX IF NOT EXISTS idx_ver_properties_created 
    ON ver_properties(created_at DESC);

-- Note: GIST spatial index on geometry column already exists from core tables migration
-- (idx_ver_properties_geom)

-- ============================================================================
-- Additional Single-Column Indexes for Common Filters
-- ============================================================================

-- Index on ver_documents hash_computed_at for filtering hashed documents
CREATE INDEX IF NOT EXISTS idx_ver_documents_hash_computed_at 
    ON ver_documents(hash_computed_at) 
    WHERE hash_computed_at IS NOT NULL;

-- Index on ver_documents updated_at for tracking document modifications
CREATE INDEX IF NOT EXISTS idx_ver_documents_updated_at 
    ON ver_documents(updated_at DESC);

-- Index on ver_properties updated_at for tracking property modifications
CREATE INDEX IF NOT EXISTS idx_ver_properties_updated_at 
    ON ver_properties(updated_at DESC);

-- ============================================================================
-- Partial Indexes for Common Filtered Queries
-- ============================================================================

-- Partial index for pending documents (common query pattern)
CREATE INDEX IF NOT EXISTS idx_ver_documents_pending 
    ON ver_documents(created_at DESC) 
    WHERE status = 'pending';

-- Partial index for verified documents (common query pattern)
CREATE INDEX IF NOT EXISTS idx_ver_documents_verified 
    ON ver_documents(created_at DESC) 
    WHERE status = 'verified';

-- Partial index for rejected documents (common query pattern)
CREATE INDEX IF NOT EXISTS idx_ver_documents_rejected 
    ON ver_documents(created_at DESC) 
    WHERE status = 'rejected';

-- Partial index for verified verifications (analytics)
CREATE INDEX IF NOT EXISTS idx_ver_verifications_verified 
    ON ver_verifications(created_at DESC) 
    WHERE status = 'verified';

-- Partial index for rejected verifications (analytics)
CREATE INDEX IF NOT EXISTS idx_ver_verifications_rejected 
    ON ver_verifications(created_at DESC) 
    WHERE status = 'rejected';

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON INDEX idx_ver_documents_property_status IS 'Optimizes queries filtering documents by property and status';
COMMENT ON INDEX idx_ver_documents_uploader_status IS 'Optimizes staff dashboard queries for uploader documents by status';
COMMENT ON INDEX idx_ver_documents_status_created IS 'Optimizes queries for recent documents filtered by status';
COMMENT ON INDEX idx_ver_verifications_document_status IS 'Optimizes queries for document verification status';
COMMENT ON INDEX idx_ver_verifications_verifier_created IS 'Optimizes verifier history queries';
COMMENT ON INDEX idx_ver_logs_actor_action IS 'Optimizes user activity tracking queries';
COMMENT ON INDEX idx_ver_logs_action_created IS 'Optimizes time-based audit queries by action type';
