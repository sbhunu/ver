-- Cleanup script to drop validation functions before re-applying migration
-- Run this if you get errors about function signatures

DROP FUNCTION IF EXISTS validate_tables_exist() CASCADE;
DROP FUNCTION IF EXISTS validate_indexes_exist() CASCADE;
DROP FUNCTION IF EXISTS validate_rls_enabled() CASCADE;
DROP FUNCTION IF EXISTS validate_postgis() CASCADE;
DROP FUNCTION IF EXISTS validate_custom_types() CASCADE;
DROP FUNCTION IF EXISTS validate_helper_functions() CASCADE;
DROP FUNCTION IF EXISTS run_schema_validation() CASCADE;
DROP FUNCTION IF EXISTS create_test_data() CASCADE;

-- Verify all functions are dropped
SELECT 
    'Functions dropped' as status,
    COUNT(*) as remaining_functions
FROM pg_proc 
WHERE proname IN (
    'validate_tables_exist',
    'validate_indexes_exist', 
    'validate_rls_enabled',
    'validate_postgis',
    'validate_custom_types',
    'validate_helper_functions',
    'run_schema_validation',
    'create_test_data'
) AND pronamespace = 'public'::regnamespace;
