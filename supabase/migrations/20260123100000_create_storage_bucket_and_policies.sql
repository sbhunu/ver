-- Create Supabase Storage Bucket and Policies
-- Sets up the 'documents' storage bucket with role-based access control

-- ============================================================================
-- Create Storage Bucket
-- ============================================================================

-- Insert the 'documents' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false, -- Private bucket (not publicly accessible)
  52428800, -- 50MB file size limit (50 * 1024 * 1024)
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Helper Functions for Storage Policies
-- ============================================================================

-- Function to check if user can access a document based on role and property
CREATE OR REPLACE FUNCTION can_access_document(storage_path TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role_val user_role;
  property_id_val UUID;
  document_id_val UUID;
  uploader_id_val UUID;
  path_parts TEXT[];
BEGIN
  -- Get current user's role
  user_role_val := get_user_role(auth.uid());
  
  IF user_role_val IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Admin can access all documents
  IF user_role_val = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Extract property ID from storage path
  -- Path format: property-{id}/documents/{uuid}-{filename}
  path_parts := string_to_array(storage_path, '/');
  
  IF array_length(path_parts, 1) < 2 THEN
    RETURN FALSE;
  END IF;
  
  -- Extract property ID from first part (property-{id})
  IF path_parts[1] LIKE 'property-%' THEN
    property_id_val := (regexp_match(path_parts[1], 'property-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'))[1]::UUID;
  ELSE
    RETURN FALSE;
  END IF;
  
  -- Extract document UUID from second part ({uuid}-{filename})
  IF path_parts[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' THEN
    document_id_val := (regexp_match(path_parts[2], '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'))[1]::UUID;
  END IF;
  
  -- If we have document ID, check document permissions
  IF document_id_val IS NOT NULL THEN
    SELECT uploader_id INTO uploader_id_val
    FROM ver_documents
    WHERE id = document_id_val;
    
    -- Users can access documents they uploaded
    IF uploader_id_val = auth.uid() THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- Role-based access:
  -- - Chief Registrar: Can access all documents
  -- - Verifier: Can access documents for verification
  -- - Staff: Can access documents they uploaded or are assigned to
  CASE user_role_val
    WHEN 'chief_registrar' THEN
      RETURN TRUE;
    WHEN 'verifier' THEN
      -- Verifiers can access documents for properties they're verifying
      -- For now, allow access to all documents (can be refined based on assignments)
      RETURN TRUE;
    WHEN 'staff' THEN
      -- Staff can only access documents they uploaded
      IF uploader_id_val = auth.uid() THEN
        RETURN TRUE;
      END IF;
      RETURN FALSE;
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can upload to a property's document folder
CREATE OR REPLACE FUNCTION can_upload_to_property(property_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role_val user_role;
BEGIN
  -- Get current user's role
  user_role_val := get_user_role(auth.uid());
  
  IF user_role_val IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Admin and Chief Registrar can upload to any property
  IF user_role_val IN ('admin', 'chief_registrar') THEN
    RETURN TRUE;
  END IF;
  
  -- Verifiers and Staff can upload documents
  IF user_role_val IN ('verifier', 'staff') THEN
    -- Verify property exists
    IF EXISTS (SELECT 1 FROM ver_properties WHERE id = property_id_param) THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can delete a document
CREATE OR REPLACE FUNCTION can_delete_document(storage_path TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role_val user_role;
  document_id_val UUID;
  uploader_id_val UUID;
  path_parts TEXT[];
BEGIN
  -- Get current user's role
  user_role_val := get_user_role(auth.uid());
  
  IF user_role_val IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Admin can delete all documents
  IF user_role_val = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Extract document UUID from storage path
  path_parts := string_to_array(storage_path, '/');
  
  IF array_length(path_parts, 1) >= 2 AND path_parts[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' THEN
    document_id_val := (regexp_match(path_parts[2], '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'))[1]::UUID;
    
    SELECT uploader_id INTO uploader_id_val
    FROM ver_documents
    WHERE id = document_id_val;
    
    -- Users can delete documents they uploaded
    IF uploader_id_val = auth.uid() THEN
      RETURN TRUE;
    END IF;
    
    -- Chief Registrar can delete documents
    IF user_role_val = 'chief_registrar' THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Storage Bucket Policies
-- ============================================================================

-- Policy: Allow authenticated users to SELECT (download) documents they have permission for
CREATE POLICY "Users can select documents they have access to"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  can_access_document(name)
);

-- Policy: Allow authenticated users to INSERT (upload) documents to properties they have permission for
CREATE POLICY "Users can insert documents to authorized properties"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (
    -- Check if path matches property structure and user can upload
    name ~ '^property-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/documents/' AND
    can_upload_to_property(
      (regexp_match(name, 'property-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'))[1]::UUID
    )
  )
);

-- Policy: Allow authenticated users to UPDATE (replace) documents they uploaded
CREATE POLICY "Users can update documents they uploaded"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (
    -- Extract document UUID and check if user is uploader
    name ~ '^property-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/documents/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' AND
    EXISTS (
      SELECT 1 FROM ver_documents
      WHERE id = (
        (regexp_match(name, 'documents/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'))[1]::UUID
      )
      AND uploader_id = auth.uid()
    )
  )
)
WITH CHECK (
  bucket_id = 'documents' AND
  (
    name ~ '^property-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/documents/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' AND
    EXISTS (
      SELECT 1 FROM ver_documents
      WHERE id = (
        (regexp_match(name, 'documents/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'))[1]::UUID
      )
      AND uploader_id = auth.uid()
    )
  )
);

-- Policy: Allow authenticated users to DELETE documents they have permission to delete
CREATE POLICY "Users can delete documents they have permission for"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  can_delete_document(name)
);

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON FUNCTION can_access_document IS 'Checks if current user can access a document based on role and property assignments. Path format: property-{id}/documents/{uuid}-{filename}';
COMMENT ON FUNCTION can_upload_to_property IS 'Checks if current user can upload documents to a specific property based on role';
COMMENT ON FUNCTION can_delete_document IS 'Checks if current user can delete a document based on role and ownership';

COMMENT ON POLICY "Users can select documents they have access to" ON storage.objects IS 'Allows authenticated users to download documents they have permission to access based on role and property assignments';
COMMENT ON POLICY "Users can insert documents to authorized properties" ON storage.objects IS 'Allows authenticated users to upload documents to properties they have permission for';
COMMENT ON POLICY "Users can update documents they uploaded" ON storage.objects IS 'Allows users to update/replace documents they originally uploaded';
COMMENT ON POLICY "Users can delete documents they have permission for" ON storage.objects IS 'Allows users to delete documents based on role and ownership';
