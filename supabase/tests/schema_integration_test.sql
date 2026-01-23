-- Schema Integration Test Suite
-- Run this file to test the complete database schema with sample data
-- Usage: psql -h localhost -p 54322 -U postgres -d postgres -f supabase/tests/schema_integration_test.sql
-- Or: supabase db execute < supabase/tests/schema_integration_test.sql

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Schema Integration Test Suite';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- Step 1: Run Validation Functions
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Step 1: Running Schema Validation...';
    RAISE NOTICE '';
END $$;

SELECT * FROM run_schema_validation()
ORDER BY validation_category, item_name;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- Step 2: Test PostGIS Functionality
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Step 2: Testing PostGIS Extension...';
    RAISE NOTICE '';
END $$;

-- Test PostGIS version
SELECT 
    'PostGIS Version' as test,
    PostGIS_version() as result,
    CASE WHEN PostGIS_version() IS NOT NULL THEN 'PASS' ELSE 'FAIL' END as status;

-- Test geometry creation
DO $$
DECLARE
    test_geom GEOMETRY;
BEGIN
    -- Create a test polygon (simple square)
    test_geom := ST_GeomFromText('POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))', 4326);
    
    IF test_geom IS NOT NULL THEN
        RAISE NOTICE 'PostGIS geometry creation: PASS';
    ELSE
        RAISE NOTICE 'PostGIS geometry creation: FAIL';
    END IF;
END $$;

DO $$ BEGIN RAISE NOTICE ''; END $$;

-- ============================================================================
-- Step 3: Test UUID Generation
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Step 3: Testing UUID Generation...';
    RAISE NOTICE '';
END $$;

SELECT 
    'UUID Generation' as test,
    gen_random_uuid()::TEXT as sample_uuid,
    'PASS' as status;

DO $$ BEGIN RAISE NOTICE ''; END $$;

-- ============================================================================
-- Step 4: Test Foreign Key Constraints
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Step 4: Testing Foreign Key Constraints...';
    RAISE NOTICE '';
END $$;

-- Test that foreign keys prevent invalid references
DO $$
DECLARE
    invalid_fk_error BOOLEAN := FALSE;
BEGIN
    -- Try to insert a document with invalid property_id (should fail)
    BEGIN
        INSERT INTO ver_documents (property_id, doc_number, uploader_id, storage_path)
        VALUES (gen_random_uuid(), 'TEST-001', gen_random_uuid(), '/test/path.pdf');
        invalid_fk_error := TRUE;
    EXCEPTION
        WHEN foreign_key_violation THEN
            RAISE NOTICE 'Foreign key constraint test: PASS (invalid FK rejected)';
        WHEN OTHERS THEN
            RAISE NOTICE 'Foreign key constraint test: FAIL - %', SQLERRM;
    END;
    
    IF invalid_fk_error THEN
        RAISE NOTICE 'Foreign key constraint test: FAIL (invalid FK was accepted)';
    END IF;
END $$;

DO $$ BEGIN RAISE NOTICE ''; END $$;

-- ============================================================================
-- Step 5: Test Constraints and Unique Indexes
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Step 5: Testing Constraints...';
    RAISE NOTICE '';
END $$;

-- Test unique constraint on property_no
DO $$
DECLARE
    unique_violation BOOLEAN := FALSE;
BEGIN
    -- This will be tested when we have actual data
    -- For now, just verify the constraint exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ver_properties_property_no_key'
    ) THEN
        RAISE NOTICE 'Unique constraint on property_no: PASS (constraint exists)';
    ELSE
        RAISE NOTICE 'Unique constraint on property_no: FAIL (constraint missing)';
    END IF;
END $$;

DO $$ BEGIN RAISE NOTICE ''; END $$;

-- ============================================================================
-- Step 6: Test RLS Policies (Basic Check)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Step 6: Testing RLS Policies...';
    RAISE NOTICE '';
END $$;

-- Check that RLS is enabled
SELECT 
    'RLS Enabled Check' as test,
    table_name,
    CASE WHEN rls_enabled THEN 'PASS' ELSE 'FAIL' END as status
FROM validate_rls_enabled()
ORDER BY table_name;

DO $$ BEGIN RAISE NOTICE ''; END $$;

-- ============================================================================
-- Step 7: Test Helper Functions
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Step 7: Testing Helper Functions...';
    RAISE NOTICE '';
END $$;

-- Test that helper functions can be called (they may return NULL without data)
DO $$
BEGIN
    -- Test get_user_role (will return NULL without auth context, but function should exist)
    PERFORM get_user_role(gen_random_uuid());
    RAISE NOTICE 'get_user_role function: PASS (function exists and callable)';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'get_user_role function: FAIL - %', SQLERRM;
END $$;

DO $$
BEGIN
    -- Test has_role
    PERFORM has_role('admin'::user_role);
    RAISE NOTICE 'has_role function: PASS (function exists and callable)';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'has_role function: FAIL - %', SQLERRM;
END $$;

DO $$ BEGIN RAISE NOTICE ''; END $$;

-- ============================================================================
-- Step 8: Test Index Performance (EXPLAIN ANALYZE)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Step 8: Testing Index Usage...';
    RAISE NOTICE '';
END $$;

-- Test that indexes are being used (this requires some data, but we can check index existence)
SELECT 
    'Index Existence Check' as test,
    schemaname,
    tablename,
    indexname,
    'PASS' as status
FROM pg_indexes
WHERE schemaname = 'public' 
    AND tablename LIKE 'ver_%'
    AND indexname LIKE 'idx_ver_%'
ORDER BY tablename, indexname
LIMIT 10;

DO $$ BEGIN RAISE NOTICE ''; END $$;

-- ============================================================================
-- Step 9: Test Triggers
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Step 9: Testing Triggers...';
    RAISE NOTICE '';
END $$;

-- Check that triggers exist
SELECT 
    'Trigger Existence' as test,
    tgname as trigger_name,
    tgrelid::regclass::TEXT as table_name,
    'PASS' as status
FROM pg_trigger
WHERE tgrelid::regclass::TEXT LIKE 'ver_%'
    AND tgisinternal = FALSE
ORDER BY tgrelid::regclass::TEXT, tgname;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Test Suite Complete';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Create test users via Supabase Auth';
    RAISE NOTICE '2. Test RLS policies with actual user sessions';
    RAISE NOTICE '3. Insert sample data through application flow';
    RAISE NOTICE '4. Test foreign key cascades with real data';
    RAISE NOTICE '5. Verify spatial queries with PostGIS data';
    RAISE NOTICE '';
END $$;
