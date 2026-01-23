-- Create Document Audit Logging Trigger
-- Automatically logs document creation, updates, and deletions to ver_logs table

-- ============================================================================
-- Function to log document actions
-- ============================================================================

CREATE OR REPLACE FUNCTION log_document_action()
RETURNS TRIGGER AS $$
DECLARE
  action_val action_type;
  target_type_val TEXT := 'document';
  details_val JSONB;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_val := 'create';
    details_val := jsonb_build_object(
      'property_id', NEW.property_id,
      'doc_number', NEW.doc_number,
      'status', NEW.status,
      'storage_path', NEW.storage_path,
      'file_size', NEW.file_size,
      'mime_type', NEW.mime_type,
      'original_filename', NEW.original_filename
    );
  ELSIF TG_OP = 'UPDATE' THEN
    action_val := 'update';
    details_val := jsonb_build_object(
      'property_id', NEW.property_id,
      'doc_number', NEW.doc_number,
      'status_old', OLD.status,
      'status_new', NEW.status,
      'storage_path', NEW.storage_path,
      'changes', jsonb_build_object(
        'status', CASE WHEN OLD.status != NEW.status THEN jsonb_build_object('from', OLD.status, 'to', NEW.status) ELSE NULL END,
        'hash_computed_at', CASE WHEN OLD.hash_computed_at IS NULL AND NEW.hash_computed_at IS NOT NULL THEN 'computed' ELSE NULL END
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    action_val := 'delete';
    details_val := jsonb_build_object(
      'property_id', OLD.property_id,
      'doc_number', OLD.doc_number,
      'status', OLD.status,
      'storage_path', OLD.storage_path
    );
  END IF;

  -- Insert audit log entry
  INSERT INTO ver_logs (
    actor_id,
    action,
    target_type,
    target_id,
    details
  ) VALUES (
    COALESCE(NEW.uploader_id, OLD.uploader_id), -- Use uploader_id as actor
    action_val,
    target_type_val,
    COALESCE(NEW.id, OLD.id), -- Document ID
    details_val
  );

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Create Trigger for Document Actions
-- ============================================================================

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS on_ver_documents_audit ON ver_documents;

-- Create trigger for INSERT, UPDATE, DELETE
CREATE TRIGGER on_ver_documents_audit
  AFTER INSERT OR UPDATE OR DELETE ON ver_documents
  FOR EACH ROW
  EXECUTE FUNCTION log_document_action();

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON FUNCTION log_document_action IS 'Automatically logs document creation, updates, and deletions to ver_logs table';
COMMENT ON TRIGGER on_ver_documents_audit ON ver_documents IS 'Triggers audit logging for all document operations (INSERT, UPDATE, DELETE)';
