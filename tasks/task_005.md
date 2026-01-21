# Task ID: 5

**Title:** SHA-256 Hashing Edge Function

**Status:** pending

**Dependencies:** 4

**Priority:** high

**Description:** Create Supabase Edge Function to compute SHA-256 hashes of uploaded documents and persist hash records

**Details:**

Create supabase/functions/hash-document Edge Function using Deno runtime. Implement streaming SHA-256 hash computation using Web Crypto API (crypto.subtle.digest). Handle large files by processing in chunks to avoid memory issues. Create ver_document_hashes record with computed hash and timestamp. Update ver_documents status to 'hashed'. Implement retry logic for transient failures. Add request validation for document_id parameter. Use Supabase client in Edge Function with service role key for database operations.

**Test Strategy:**

Unit tests with known file content and expected SHA-256 hashes. Test with various file sizes including large scanned PDFs. Verify hash consistency across multiple computations of same file. Test error handling for corrupted files and storage access failures. Performance testing with 10MB+ files.

## Subtasks

### 5.1. Create Edge Function Structure and Configuration

**Status:** pending  
**Dependencies:** None  

Set up the basic Supabase Edge Function structure for hash-document with proper Deno runtime configuration and environment setup

**Details:**

Create supabase/functions/hash-document directory structure with index.ts entry point. Configure function.json with proper Deno runtime settings. Set up TypeScript configuration for Edge Function environment. Import required dependencies including Supabase client and Web Crypto API. Configure environment variables for service role key access.

### 5.2. Implement Request Validation and Document Retrieval

**Status:** pending  
**Dependencies:** 5.1  

Add comprehensive request validation for document_id parameter and implement secure document retrieval from Supabase Storage

**Details:**

Implement request body validation to ensure document_id is provided and valid UUID format. Add authentication checks using service role key. Retrieve document metadata from ver_documents table to get storage path. Implement error handling for missing or inaccessible documents. Add logging for validation failures and security events.

### 5.3. Implement Streaming SHA-256 Hash Computation

**Status:** pending  
**Dependencies:** 5.2  

Create streaming hash computation using Web Crypto API with chunked processing for large files to avoid memory issues

**Details:**

Implement streaming file reader that processes documents in configurable chunks (default 64KB). Use crypto.subtle.digest with SHA-256 algorithm for hash computation. Handle large scanned PDFs by processing incrementally without loading entire file into memory. Add progress tracking for long-running hash operations. Implement proper error handling for corrupted files or read failures.

### 5.4. Implement Database Operations and Transaction Management

**Status:** pending  
**Dependencies:** 5.3  

Create database operations to persist hash records and update document status with proper transaction management

**Details:**

Create ver_document_hashes record with computed hash, document_id, algorithm (SHA-256), and timestamp. Update ver_documents table to set status to 'hashed' and hash_computed_at timestamp. Implement atomic transaction to ensure both operations succeed or fail together. Add proper error handling for database constraint violations. Use Supabase client with service role key for elevated permissions.

### 5.5. Add Retry Logic and Error Handling

**Status:** pending  
**Dependencies:** 5.4  

Implement comprehensive retry logic for transient failures and robust error handling with proper logging

**Details:**

Implement exponential backoff retry logic for transient database and storage failures. Add configurable retry attempts (default 3) with increasing delays. Implement comprehensive error handling for network timeouts, storage access failures, and database connection issues. Add structured logging for all operations including success, failures, and retry attempts. Create proper HTTP response codes and error messages for different failure scenarios.
