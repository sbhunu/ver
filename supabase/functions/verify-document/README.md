# Verify Document Edge Function

Supabase Edge Function for document verification by re-hashing and comparing against stored hashes.

## Overview

This Edge Function implements the document verification workflow:
1. Accepts verification file upload
2. Computes SHA-256 hash of the verification file
3. Compares with latest stored hash from `ver_document_hashes`
4. Creates `ver_verifications` record with outcome (verified/rejected)
5. Updates document status based on verification result
6. Optionally stores verification files for audit purposes

## Environment Variables

Required environment variables (set in Supabase dashboard):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database operations

## API

### POST /verify-document

Verifies a document by comparing its hash with stored hash.

**Request Body:**
```json
{
  "documentId": "uuid",
  "verifierId": "uuid",
  "file": "base64-encoded-file-or-arraybuffer",
  "reason": "optional verification reason",
  "verificationStoragePath": "optional storage path for verification file"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "verificationId": "uuid",
    "status": "verified" | "rejected",
    "hashMatch": true,
    "discrepancyMetadata": {}
  }
}
```

## Features

- SHA-256 hash computation using Web Crypto API
- Streaming hash computation for large files
- Atomic verification operations
- Discrepancy detection (file size differences, etc.)
- Optional verification file storage
- Batch verification support (future)

## Development

```bash
# Test locally with Supabase CLI
supabase functions serve verify-document

# Deploy to Supabase
supabase functions deploy verify-document
```

## Dependencies

- `@supabase/supabase-js` - Supabase client library
- Web Crypto API - For SHA-256 hashing (built into Deno)
