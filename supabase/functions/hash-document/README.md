# Hash Document Edge Function

Supabase Edge Function to compute SHA-256 hashes of uploaded documents and persist hash records.

## Overview

This Edge Function:
- Computes SHA-256 hashes of documents stored in Supabase Storage
- Stores hash records in `ver_document_hashes` table
- Updates document status to 'hashed' after successful hash computation
- Handles large files efficiently using streaming

## Environment Variables

The function requires the following environment variables (automatically provided by Supabase):

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database operations

## API

### POST /hash-document

Compute SHA-256 hash for a document and store it in the database.

**Request Body:**
```json
{
  "document_id": "uuid-of-document"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "document_id": "uuid-of-document",
  "hash": "sha256-hash-hex-string",
  "algorithm": "SHA-256",
  "created_at": "2024-01-23T12:00:00Z"
}
```

**Error Responses:**

- `400` - Bad request (missing or invalid document_id)
- `404` - Document not found
- `405` - Method not allowed (must use POST)
- `500` - Internal server error

## Local Development

1. **Start Supabase locally:**
   ```bash
   supabase start
   ```

2. **Serve the function locally:**
   ```bash
   supabase functions serve hash-document
   ```

3. **Test the function:**
   ```bash
   curl -X POST http://localhost:54321/functions/v1/hash-document \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"document_id": "your-document-uuid"}'
   ```

## Deployment

Deploy to Supabase:

```bash
supabase functions deploy hash-document
```

## Implementation Details

- Uses Deno runtime with Web Crypto API (`crypto.subtle.digest`)
- Processes large files in chunks (1MB default) to avoid memory issues
- Automatically handles files > 10MB with streaming
- Validates document_id parameter (UUID format)
- Checks if document is already hashed to avoid duplicate work
- Updates document status atomically after hash creation

## Dependencies

- `@supabase/supabase-js@2` - Supabase client library (via JSR)
