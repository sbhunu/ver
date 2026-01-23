# Schema Integration Testing

This directory contains test scripts for validating the complete database schema integration.

## Files

- `schema_integration_test.sql` - Comprehensive integration test suite
- `README.md` - This file

## Running the Tests

### Prerequisites

1. Supabase must be running locally
2. All migrations must be applied
3. Database connection credentials

### Method 1: Using psql

```bash
# Connect to local Supabase database
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/tests/schema_integration_test.sql
```

### Method 2: Using Supabase CLI

```bash
# Apply all migrations first
supabase db reset

# Then run validation functions
supabase db execute "SELECT * FROM run_schema_validation();"
```

### Method 3: Using Database Client

Open `schema_integration_test.sql` in your database client (pgAdmin, DBeaver, etc.) and execute it.

## Validation Functions

The migration `20260123085002_validate_schema_integration.sql` creates several validation functions:

- `validate_tables_exist()` - Checks all required tables exist
- `validate_indexes_exist()` - Checks critical indexes are created
- `validate_rls_enabled()` - Verifies RLS is enabled on all tables
- `validate_postgis()` - Validates PostGIS extension installation
- `validate_custom_types()` - Checks custom enum types exist
- `validate_helper_functions()` - Verifies helper functions exist
- `run_schema_validation()` - Runs all validations and returns comprehensive results

## Test Coverage

The test suite validates:

1. ✅ **Table Existence** - All 6 ver_ tables exist
2. ✅ **RLS Policies** - RLS enabled on all tables
3. ✅ **PostGIS Extension** - PostGIS installed and functional
4. ✅ **Custom Types** - All enum types exist
5. ✅ **Helper Functions** - All RLS helper functions exist
6. ✅ **Foreign Key Constraints** - Constraints prevent invalid references
7. ✅ **Unique Constraints** - Unique indexes work correctly
8. ✅ **Indexes** - Critical indexes are created
9. ✅ **Triggers** - All triggers are in place
10. ✅ **UUID Generation** - UUID functions work

## Expected Results

All tests should return `PASS` status. If any test fails:

1. Check that all migrations have been applied
2. Verify Supabase is running correctly
3. Review error messages for specific issues
4. Re-run migrations if needed: `supabase db reset`

## Manual Testing Checklist

After automated tests pass, perform manual testing:

- [ ] Create test users via Supabase Auth
- [ ] Test RLS policies with different user roles
- [ ] Insert sample property with PostGIS geometry
- [ ] Upload test document and verify hash creation
- [ ] Test verification workflow
- [ ] Verify audit logging works
- [ ] Test foreign key cascades (delete property → documents cascade)
- [ ] Test spatial queries with PostGIS functions
- [ ] Verify role-based access restrictions

## Troubleshooting

### "function does not exist" errors
- Ensure all migrations have been applied
- Run `supabase db reset` to apply all migrations

### "relation does not exist" errors
- Check that table creation migrations ran successfully
- Verify migration order is correct

### RLS policy errors
- Ensure RLS policies migration was applied
- Check that helper functions exist and are callable

### PostGIS errors
- Verify PostGIS extension migration was applied
- Check: `SELECT PostGIS_version();`
