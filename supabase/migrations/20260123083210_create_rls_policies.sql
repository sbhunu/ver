-- Row Level Security (RLS) Policies
-- Enable RLS on all ver_ tables and create comprehensive policies based on user roles

-- ============================================================================
-- Helper Functions for RLS Policies
-- ============================================================================

-- Drop functions if they exist (to handle return type changes)
DROP FUNCTION IF EXISTS get_user_role(UUID);
DROP FUNCTION IF EXISTS has_role(user_role);
DROP FUNCTION IF EXISTS has_any_role(user_role[]);
DROP FUNCTION IF EXISTS is_profile_owner(UUID);
DROP FUNCTION IF EXISTS is_document_uploader(UUID);

-- Function to get current user's role from ver_profiles
CREATE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
BEGIN
    RETURN (SELECT role FROM ver_profiles WHERE id = user_id);
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user has a specific role
CREATE FUNCTION has_role(required_role user_role)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role(auth.uid()) = required_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user has any of the specified roles
CREATE FUNCTION has_any_role(required_roles user_role[])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role(auth.uid()) = ANY(required_roles);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is owner (for ver_profiles)
CREATE FUNCTION is_profile_owner(profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.uid() = profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is document uploader
CREATE FUNCTION is_document_uploader(doc_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.uid() = (SELECT uploader_id FROM ver_documents WHERE id = doc_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Enable RLS on all ver_ tables
-- ============================================================================

ALTER TABLE ver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ver_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE ver_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ver_document_hashes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ver_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ver_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ver_profiles Policies
-- Users can only access their own profile
-- ============================================================================

-- SELECT: Users can only read their own profile
CREATE POLICY "Users can view own profile"
    ON ver_profiles FOR SELECT
    USING (is_profile_owner(id));

-- UPDATE: Users can update their own profile
-- Note: Role changes are handled by a trigger (see below) to prevent non-admin role changes
CREATE POLICY "Users can update own profile"
    ON ver_profiles FOR UPDATE
    USING (is_profile_owner(id))
    WITH CHECK (is_profile_owner(id));

-- INSERT: Only service role can insert (via trigger from auth.users)
-- No policy needed - handled by trigger with SECURITY DEFINER

-- DELETE: Only admin can delete profiles
CREATE POLICY "Only admin can delete profiles"
    ON ver_profiles FOR DELETE
    USING (has_role('admin'));

-- ============================================================================
-- ver_properties Policies
-- Role-based access for property management
-- ============================================================================

-- SELECT: All authenticated users can read properties
CREATE POLICY "Authenticated users can view properties"
    ON ver_properties FOR SELECT
    USING (auth.role() = 'authenticated');

-- INSERT: Staff, chief_registrar, and admin can create properties
CREATE POLICY "Staff and above can create properties"
    ON ver_properties FOR INSERT
    WITH CHECK (
        has_any_role(ARRAY['staff', 'chief_registrar', 'admin']::user_role[])
    );

-- UPDATE: Staff, chief_registrar, and admin can update properties
CREATE POLICY "Staff and above can update properties"
    ON ver_properties FOR UPDATE
    USING (
        has_any_role(ARRAY['staff', 'chief_registrar', 'admin']::user_role[])
    )
    WITH CHECK (
        has_any_role(ARRAY['staff', 'chief_registrar', 'admin']::user_role[])
    );

-- DELETE: Only chief_registrar and admin can delete properties
CREATE POLICY "Only registrar and admin can delete properties"
    ON ver_properties FOR DELETE
    USING (
        has_any_role(ARRAY['chief_registrar', 'admin']::user_role[])
    );

-- ============================================================================
-- ver_documents Policies
-- Role-based access with ownership checks
-- ============================================================================

-- SELECT: 
-- - Staff can see their own uploads
-- - Verifiers can see documents assigned to them (or all pending)
-- - Chief registrar and admin can see all
CREATE POLICY "Users can view documents based on role"
    ON ver_documents FOR SELECT
    USING (
        -- Staff can see their own uploads
        (has_role('staff') AND is_document_uploader(id)) OR
        -- Verifiers can see all documents (for assignment)
        has_role('verifier') OR
        -- Chief registrar and admin can see all
        has_any_role(ARRAY['chief_registrar', 'admin']::user_role[])
    );

-- INSERT: Staff, chief_registrar, and admin can upload documents
CREATE POLICY "Staff and above can create documents"
    ON ver_documents FOR INSERT
    WITH CHECK (
        has_any_role(ARRAY['staff', 'chief_registrar', 'admin']::user_role[]) AND
        auth.uid() = uploader_id
    );

-- UPDATE: 
-- - Staff can update their own uploads (limited fields)
-- - Chief registrar and admin can update any document
CREATE POLICY "Users can update documents based on role"
    ON ver_documents FOR UPDATE
    USING (
        (has_role('staff') AND is_document_uploader(id)) OR
        has_any_role(ARRAY['chief_registrar', 'admin']::user_role[])
    )
    WITH CHECK (
        (has_role('staff') AND is_document_uploader(id)) OR
        has_any_role(ARRAY['chief_registrar', 'admin']::user_role[])
    );

-- DELETE: Only chief_registrar and admin can delete documents
CREATE POLICY "Only registrar and admin can delete documents"
    ON ver_documents FOR DELETE
    USING (
        has_any_role(ARRAY['chief_registrar', 'admin']::user_role[])
    );

-- ============================================================================
-- ver_document_hashes Policies
-- Same access as ver_documents (read), but only system can insert
-- ============================================================================

-- SELECT: Same as ver_documents (users can see hashes for documents they can see)
CREATE POLICY "Users can view hashes for accessible documents"
    ON ver_document_hashes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM ver_documents d
            WHERE d.id = ver_document_hashes.document_id
            AND (
                (has_role('staff') AND d.uploader_id = auth.uid()) OR
                has_role('verifier') OR
                has_any_role(ARRAY['chief_registrar', 'admin']::user_role[])
            )
        )
    );

-- INSERT: Only service role can insert (via Edge Function)
-- No policy - service role bypasses RLS

-- UPDATE: Immutable - no updates allowed
-- No policy needed

-- DELETE: Immutable - no deletes allowed
-- No policy needed

-- ============================================================================
-- ver_verifications Policies
-- Verifiers can create, all authenticated users can read
-- ============================================================================

-- SELECT: All authenticated users can read verifications
CREATE POLICY "Authenticated users can view verifications"
    ON ver_verifications FOR SELECT
    USING (auth.role() = 'authenticated');

-- INSERT: Verifiers, chief_registrar, and admin can create verifications
CREATE POLICY "Verifiers and above can create verifications"
    ON ver_verifications FOR INSERT
    WITH CHECK (
        has_any_role(ARRAY['verifier', 'chief_registrar', 'admin']::user_role[]) AND
        auth.uid() = verifier_id
    );

-- UPDATE: Immutable - no updates allowed after creation
-- No policy needed

-- DELETE: Immutable - no deletes allowed
-- No policy needed

-- ============================================================================
-- ver_logs Policies
-- Admin read-only (immutable table)
-- ============================================================================

-- SELECT: Only admin and chief_registrar can read audit logs
CREATE POLICY "Only registrar and admin can view audit logs"
    ON ver_logs FOR SELECT
    USING (
        has_any_role(ARRAY['chief_registrar', 'admin']::user_role[])
    );

-- INSERT: Only service role can insert (via triggers and Edge Functions)
-- No policy - service role bypasses RLS, or use SECURITY DEFINER functions

-- UPDATE: Immutable - prevented by trigger
-- No policy needed

-- DELETE: Immutable - prevented by trigger
-- No policy needed

-- ============================================================================
-- Grant necessary permissions
-- ============================================================================

-- Grant usage on sequences (for UUID generation)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Grant execute on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_role(user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION has_any_role(user_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION is_profile_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_document_uploader(UUID) TO authenticated;

-- ============================================================================
-- Trigger to prevent role changes unless user is admin
-- ============================================================================

-- Function to prevent role changes by non-admin users
CREATE OR REPLACE FUNCTION prevent_role_change_unless_admin()
RETURNS TRIGGER AS $$
BEGIN
    -- If role is being changed and user is not admin, raise error
    IF OLD.role != NEW.role AND NOT has_role('admin') THEN
        RAISE EXCEPTION 'Only administrators can change user roles';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on ver_profiles to enforce role change restriction
CREATE TRIGGER prevent_role_change_unless_admin_trigger
    BEFORE UPDATE ON ver_profiles
    FOR EACH ROW
    WHEN (OLD.role IS DISTINCT FROM NEW.role)
    EXECUTE FUNCTION prevent_role_change_unless_admin();

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON FUNCTION get_user_role(UUID) IS 'Helper function to get user role from ver_profiles for RLS policies';
COMMENT ON FUNCTION has_role(user_role) IS 'Check if current user has a specific role';
COMMENT ON FUNCTION has_any_role(user_role[]) IS 'Check if current user has any of the specified roles';
COMMENT ON FUNCTION is_profile_owner(UUID) IS 'Check if current user owns a profile';
COMMENT ON FUNCTION is_document_uploader(UUID) IS 'Check if current user uploaded a document';
