-- Schema Integration Validation and Testing
-- This migration creates validation functions and can be used to verify schema integrity
-- Run validation queries after applying all migrations

-- ============================================================================
-- Drop existing validation functions if they exist (to handle signature changes)
-- ============================================================================

-- Drop all overloads of these functions (handles signature changes)
DO $$ 
BEGIN
    -- Drop validate_tables_exist with any signature
    DROP FUNCTION IF EXISTS validate_tables_exist() CASCADE;
    
    -- Drop validate_indexes_exist with any signature  
    DROP FUNCTION IF EXISTS validate_indexes_exist() CASCADE;
    
    -- Drop validate_rls_enabled with any signature
    DROP FUNCTION IF EXISTS validate_rls_enabled() CASCADE;
    
    -- Drop validate_postgis with any signature
    DROP FUNCTION IF EXISTS validate_postgis() CASCADE;
    
    -- Drop validate_custom_types with any signature
    DROP FUNCTION IF EXISTS validate_custom_types() CASCADE;
    
    -- Drop validate_helper_functions with any signature
    DROP FUNCTION IF EXISTS validate_helper_functions() CASCADE;
    
    -- Drop run_schema_validation with any signature
    DROP FUNCTION IF EXISTS run_schema_validation() CASCADE;
    
    -- Drop create_test_data with any signature
    DROP FUNCTION IF EXISTS create_test_data() CASCADE;
END $$;

-- ============================================================================
-- Validation Functions
-- ============================================================================

-- Function to validate all required tables exist
CREATE FUNCTION validate_tables_exist()
RETURNS TABLE(table_name TEXT, table_exists BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        required.table_name::TEXT,
        CASE WHEN ist.table_name IS NOT NULL THEN TRUE ELSE FALSE END as table_exists
    FROM (
        VALUES 
            ('ver_profiles'),
            ('ver_properties'),
            ('ver_documents'),
            ('ver_document_hashes'),
            ('ver_verifications'),
            ('ver_logs')
    ) AS required(table_name)
    LEFT JOIN information_schema.tables ist 
        ON ist.table_schema = 'public' 
        AND ist.table_name = required.table_name;
END;
$$ LANGUAGE plpgsql;

-- Function to validate all required indexes exist
CREATE FUNCTION validate_indexes_exist()
RETURNS TABLE(index_name TEXT, index_exists BOOLEAN, table_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.index_name::TEXT,
        CASE WHEN i.indexname IS NOT NULL THEN TRUE ELSE FALSE END as index_exists,
        r.table_name::TEXT
    FROM (
        VALUES 
            ('idx_ver_profiles_role', 'ver_profiles'),
            ('idx_ver_profiles_email', 'ver_profiles'),
            ('idx_ver_properties_geom', 'ver_properties'),
            ('idx_ver_properties_property_no', 'ver_properties'),
            ('idx_ver_documents_property_id', 'ver_documents'),
            ('idx_ver_documents_status', 'ver_documents'),
            ('idx_ver_document_hashes_document_id', 'ver_document_hashes'),
            ('idx_ver_verifications_document_id', 'ver_verifications'),
            ('idx_ver_logs_actor_id', 'ver_logs'),
            ('idx_ver_logs_details', 'ver_logs')
    ) AS required(index_name, table_name)
    LEFT JOIN pg_indexes i 
        ON i.schemaname = 'public' 
        AND i.indexname = required.index_name;
END;
$$ LANGUAGE plpgsql;

-- Function to validate RLS is enabled on all tables
CREATE FUNCTION validate_rls_enabled()
RETURNS TABLE(table_name TEXT, rls_enabled BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        required.table_name::TEXT,
        COALESCE(c.relrowsecurity, FALSE) as rls_enabled
    FROM (
        VALUES 
            ('ver_profiles'),
            ('ver_properties'),
            ('ver_documents'),
            ('ver_document_hashes'),
            ('ver_verifications'),
            ('ver_logs')
    ) AS required(table_name)
    LEFT JOIN pg_class c ON c.relname = required.table_name AND c.relnamespace = 'public'::regnamespace;
END;
$$ LANGUAGE plpgsql;

-- Function to validate PostGIS extension
CREATE FUNCTION validate_postgis()
RETURNS TABLE(extension_name TEXT, installed BOOLEAN, version TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'postgis'::TEXT,
        CASE WHEN EXISTS (
            SELECT 1 FROM pg_extension WHERE extname = 'postgis'
        ) THEN TRUE ELSE FALSE END,
        COALESCE(
            (SELECT PostGIS_version()::TEXT),
            'Not installed'::TEXT
        );
END;
$$ LANGUAGE plpgsql;

-- Function to validate custom types/enums exist
CREATE FUNCTION validate_custom_types()
RETURNS TABLE(type_name TEXT, type_exists BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        required.type_name::TEXT,
        CASE WHEN pt.typname IS NOT NULL THEN TRUE ELSE FALSE END as type_exists
    FROM (
        VALUES 
            ('user_role'),
            ('document_status'),
            ('verification_status'),
            ('action_type')
    ) AS required(type_name)
    LEFT JOIN pg_type pt 
        ON pt.typname = required.type_name 
        AND pt.typtype = 'e'; -- 'e' = enum
END;
$$ LANGUAGE plpgsql;

-- Function to validate helper functions exist
CREATE FUNCTION validate_helper_functions()
RETURNS TABLE(function_name TEXT, function_exists BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        required.function_name::TEXT,
        CASE WHEN pf.proname IS NOT NULL THEN TRUE ELSE FALSE END as function_exists
    FROM (
        VALUES 
            ('get_user_role'),
            ('has_role'),
            ('has_any_role'),
            ('is_profile_owner'),
            ('is_document_uploader'),
            ('update_updated_at_column'),
            ('prevent_log_modification'),
            ('prevent_role_change_unless_admin')
    ) AS required(function_name)
    LEFT JOIN pg_proc pf 
        ON pf.proname = required.function_name 
        AND pf.pronamespace = 'public'::regnamespace;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comprehensive Validation Function
-- ============================================================================

CREATE FUNCTION run_schema_validation()
RETURNS TABLE(
    validation_category TEXT,
    item_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Validate tables
    RETURN QUERY
    SELECT 
        'Tables'::TEXT as category,
        table_name as item,
        CASE WHEN table_exists THEN 'PASS' ELSE 'FAIL' END as status,
        CASE WHEN table_exists THEN 'Table exists' ELSE 'Table missing' END as details
    FROM validate_tables_exist();
    
    -- Validate RLS
    RETURN QUERY
    SELECT 
        'RLS'::TEXT as category,
        table_name as item,
        CASE WHEN rls_enabled THEN 'PASS' ELSE 'FAIL' END as status,
        CASE WHEN rls_enabled THEN 'RLS enabled' ELSE 'RLS not enabled' END as details
    FROM validate_rls_enabled();
    
    -- Validate PostGIS
    RETURN QUERY
    SELECT 
        'PostGIS'::TEXT as category,
        extension_name as item,
        CASE WHEN installed THEN 'PASS' ELSE 'FAIL' END as status,
        CASE WHEN installed THEN 'Version: ' || version ELSE 'Not installed' END as details
    FROM validate_postgis();
    
    -- Validate custom types
    RETURN QUERY
    SELECT 
        'Custom Types'::TEXT as category,
        type_name as item,
        CASE WHEN type_exists THEN 'PASS' ELSE 'FAIL' END as status,
        CASE WHEN type_exists THEN 'Type exists' ELSE 'Type missing' END as details
    FROM validate_custom_types();
    
    -- Validate helper functions
    RETURN QUERY
    SELECT 
        'Helper Functions'::TEXT as category,
        function_name as item,
        CASE WHEN function_exists THEN 'PASS' ELSE 'FAIL' END as status,
        CASE WHEN function_exists THEN 'Function exists' ELSE 'Function missing' END as details
    FROM validate_helper_functions();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Test Data Insertion Functions (for integration testing)
-- ============================================================================

-- Function to create test data (for manual testing)
-- Note: This requires proper auth context and should be run with appropriate permissions
CREATE FUNCTION create_test_data()
RETURNS TABLE(operation TEXT, status TEXT, details TEXT) AS $$
DECLARE
    test_property_id UUID;
    test_document_id UUID;
    test_hash_id UUID;
BEGIN
    -- This function is a template for creating test data
    -- In practice, test data should be created via proper application flow with auth context
    
    RETURN QUERY
    SELECT 
        'Test Data Creation'::TEXT,
        'INFO'::TEXT,
        'Use application APIs or Edge Functions to create test data with proper auth context'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION validate_tables_exist() IS 'Validates all required ver_ tables exist';
COMMENT ON FUNCTION validate_indexes_exist() IS 'Validates critical indexes are created';
COMMENT ON FUNCTION validate_rls_enabled() IS 'Validates RLS is enabled on all ver_ tables';
COMMENT ON FUNCTION validate_postgis() IS 'Validates PostGIS extension is installed and working';
COMMENT ON FUNCTION validate_custom_types() IS 'Validates custom enum types exist';
COMMENT ON FUNCTION validate_helper_functions() IS 'Validates all helper functions exist';
COMMENT ON FUNCTION run_schema_validation() IS 'Runs comprehensive schema validation and returns results';
