# Supabase Local Development Setup

This project uses Supabase for authentication, database, storage, and Edge Functions.

## Prerequisites

- Docker and Docker Compose installed
- Supabase CLI v1.127+ installed

## Initial Setup

1. **Start Supabase locally:**
   ```bash
   supabase start
   ```

2. **Get your local credentials:**
   ```bash
   supabase status
   ```
   This will show your local API URL, anon key, and service role key.

3. **Copy environment variables:**
   ```bash
   cp .env.local.example .env.local
   ```
   Then update `.env.local` with the values from `supabase status`.

## PostGIS Extension

PostGIS is enabled via migration `20260123082252_enable_postgis.sql` to support spatial data in the `ver_properties` table.

To verify PostGIS is working:
```sql
SELECT PostGIS_version();
```

## Database Migrations

Migrations are stored in `supabase/migrations/`. To create a new migration:
```bash
supabase migration new migration_name
```

To apply migrations:
```bash
supabase db reset  # Resets and applies all migrations
```

## Useful Commands

- `supabase start` - Start local Supabase instance
- `supabase stop` - Stop local Supabase instance
- `supabase status` - Show connection details
- `supabase db reset` - Reset database and apply all migrations
- `supabase migration list` - List all migrations

## Next Steps

After starting Supabase, proceed with Task 1.2: Create Core Database Tables with ver_ Prefix.
