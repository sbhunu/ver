# Fix: "The file system does not support extended attributes"

This error occurs when uploading files to Supabase Storage locally. The Storage service's **file backend** uses extended attributes (xattr) for metadata, which some filesystems (e.g. WSL2, NFS, tmpfs, certain Docker volume drivers) do not support or have disabled.

## Solutions

### Option 1: Use Supabase Cloud (Recommended for production-like dev)

Use a hosted Supabase project instead of local. Cloud Storage does not rely on xattr.

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard)
2. Update `.env.local` with the project’s `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Run migrations: `supabase db push` (or link and push)

### Option 2: Switch local Storage to S3/MinIO (Self-hosted Docker)

Run Supabase with the **S3 backend** instead of the file backend. MinIO provides S3-compatible storage and avoids xattr.

**A. Using Supabase self-hosted Docker (not CLI):**

1. Clone Supabase:
   ```bash
   git clone --depth 1 https://github.com/supabase/supabase
   cd supabase
   ```

2. Copy compose files into your project:
   ```bash
   mkdir -p ../ver/supabase-docker
   cp -rf docker/* ../ver/supabase-docker/
   cp docker/.env.example ../ver/supabase-docker/.env
   ```

3. Start with S3:
   ```bash
   cd ../ver/supabase-docker
   docker compose -f docker-compose.yml -f docker-compose.s3.yml up -d
   ```

4. Update `.env.local` to use the Docker API URL and keys from the setup.

**B. If you use `supabase start` (CLI):**

The CLI generates its own compose and does not easily support switching to S3. Options:

- Use **Option 1** (Supabase Cloud) for storage-heavy development, or
- Use **Option 2A** (manual Docker with S3 compose) when you need local S3 storage.

### Option 3: Change filesystem/volume (may work on Linux)

If you are on Linux with Docker:

- Use a local filesystem that supports xattr (e.g. ext4, XFS)
- Avoid NFS, tmpfs, or volume drivers that strip xattr
- Ensure the volume is not mounted with `noacl` or similar options that disable xattr

---

## Root cause

Supabase Storage supports two backends:

| Backend | Env var        | Uses xattr | When used                          |
|---------|----------------|------------|------------------------------------|
| `file`  | (default)      | Yes        | Default for `supabase start`       |
| `s3`    | STORAGE_BACKEND=s3 | No    | When using docker-compose.s3.yml   |

The file backend writes metadata via xattr. Filesystems without xattr support trigger this error.

## References

- [Supabase self-hosting – Configuring S3 Storage](https://supabase.com/docs/guides/self-hosting/docker#configuring-s3-storage)
- [Supabase docker-compose.s3.yml](https://github.com/supabase/supabase/blob/master/docker/docker-compose.s3.yml)
- GitHub: [supabase/storage-api#20096](https://github.com/supabase/storage-api/issues/20096)
