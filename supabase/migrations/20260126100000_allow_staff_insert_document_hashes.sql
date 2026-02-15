-- Allow staff and above to insert into ver_document_hashes
-- Fixes "No suitable key or wrong key type" when SUPABASE_SERVICE_ROLE_KEY
-- has JWT verification issues. Staff can now insert hashes using their
-- authenticated session (no service role needed for hash operations).
-- ============================================================================

CREATE POLICY "Staff and above can insert hashes for documents"
    ON ver_document_hashes FOR INSERT
    WITH CHECK (
        (has_role('staff') OR has_role('verifier') OR has_any_role(ARRAY['chief_registrar', 'admin']::user_role[]))
        AND EXISTS (SELECT 1 FROM ver_documents d WHERE d.id = ver_document_hashes.document_id)
    );
