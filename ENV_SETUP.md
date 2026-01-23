# Environment Variables Setup

## Current Configuration Status

### ⚠️ Important Notes

1. **Port Conflict Detected**: Your `.env` and `.env.local` files currently point to port `8000`, but your Supabase config (`supabase/config.toml`) uses port `54321`. 

2. **Multiple Supabase Projects**: This project shares the same production directory with other applications (`apr`, `clas`, `maprail`, etc.), but each has its own Supabase instance with different `project_id` values. No conflicts expected.

3. **Demo Keys**: The current environment variables contain demo/placeholder keys. These need to be replaced with actual keys from your running Supabase instance.

## Setup Instructions

### Step 1: Start Supabase Locally

```bash
supabase start
```

### Step 2: Get Your Local Credentials

```bash
supabase status
```

This will output something like:
```
API URL: http://localhost:54321
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 3: Update Environment Variables

**Option A: Update `.env.local` (Recommended for local development)**
```bash
# Copy the example file
cp .env.local.example .env.local

# Edit .env.local with your actual values from `supabase status`
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

**Option B: Update `.env` (If you prefer using .env)**
```bash
# Edit .env with your actual values
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### Step 4: Verify Configuration

The correct configuration should have:
- ✅ `NEXT_PUBLIC_SUPABASE_URL` pointing to `http://localhost:54321` (NOT 8000)
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` with a valid JWT token
- ✅ `SUPABASE_SERVICE_ROLE_KEY` with a valid JWT token (for server-side operations)

## Environment Variable Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL | Yes | `http://localhost:54321` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (safe for client) | Yes | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only) | Yes* | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `DATABASE_URL` | Direct PostgreSQL connection | No | `postgresql://postgres:postgres@localhost:54322/postgres` |

*Required for server-side operations that bypass RLS

## Troubleshooting

### Port 8000 vs 54321

If you see port 8000 in your environment variables:
- This is likely from another application or old configuration
- Update to port 54321 to match your local Supabase instance
- Check `supabase/config.toml` to confirm the correct port

### Multiple Supabase Projects

Each project in `/home/sbhunu/production/` has its own Supabase instance:
- `ver` - project_id: "ver", port: 54321
- `maprail` - project_id: "maprail", port: 54321
- etc.

They run on the same port but are isolated by Docker container names. No conflicts expected.

### Getting Fresh Keys

If you need to regenerate keys:
```bash
supabase stop
supabase start
supabase status  # Get new keys
```

## Production Environment

For production, you'll need to:
1. Get your production Supabase project URL and keys from the Supabase dashboard
2. Update environment variables in your deployment platform (Vercel, etc.)
3. Ensure `NEXT_PUBLIC_SUPABASE_URL` points to your production Supabase instance
