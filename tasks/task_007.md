# Task ID: 7

**Title:** Document Verification Edge Function

**Status:** pending

**Dependencies:** 5, 6

**Priority:** high

**Description:** Create verification system to re-hash uploaded documents and compare against stored hashes with decision logging

**Details:**

Create supabase/functions/verify-document Edge Function. Implement verification workflow: accept verification file upload, compute SHA-256 hash, compare with latest stored hash from ver_document_hashes. Create ver_verifications record with outcome (verified/rejected), reason, and verifier_id. Update document status based on verification result. Implement optional storage of verification files for audit purposes. Add support for batch verification. Include discrepancy detection metadata (file size differences, etc.). Ensure atomic operations for verification decisions.

**Test Strategy:**

Test hash matching with identical files. Test mismatch detection with altered files. Verify verification records are created correctly. Test batch verification functionality. Validate atomic transaction behavior on verification decisions.

## Subtasks

### 7.1. Create Supabase Edge Function Structure

**Status:** pending  
**Dependencies:** None  

Set up the basic Edge Function structure for document verification with proper TypeScript configuration and dependencies

**Details:**

Create supabase/functions/verify-document directory with index.ts file. Configure TypeScript with proper types for Supabase Edge Functions runtime. Import required dependencies including crypto for SHA-256 hashing, Supabase client for database operations, and storage client for file handling. Set up proper CORS headers and error handling middleware.

### 7.2. Implement File Upload and Hash Computation

**Status:** pending  
**Dependencies:** 7.1  

Create the core functionality to accept verification file uploads and compute SHA-256 hashes with streaming support for large files

**Details:**

Implement multipart file upload handling in the Edge Function. Create streaming SHA-256 hash computation to handle large PDF files efficiently without memory overflow. Add file size validation and MIME type checking. Implement chunked processing for files larger than memory limits. Include progress tracking for large file processing.

### 7.3. Implement Hash Comparison and Verification Logic

**Status:** pending  
**Dependencies:** 7.2  

Create the verification workflow that compares computed hashes against stored hashes from ver_document_hashes table

**Details:**

Query ver_document_hashes table to retrieve the latest stored hash for the document. Implement secure hash comparison using constant-time comparison to prevent timing attacks. Create verification decision logic with detailed reason codes for matches and mismatches. Include metadata collection for discrepancies such as file size differences, timestamp variations, and hash algorithm versions.

### 7.4. Create Verification Records and Audit Logging

**Status:** pending  
**Dependencies:** 7.3  

Implement atomic database operations to create ver_verifications records and update document status with comprehensive audit logging

**Details:**

Create ver_verifications record with outcome (verified/rejected), detailed reason, verifier_id, timestamp, and verification metadata. Update document status in ver_documents table based on verification result. Implement atomic transactions to ensure data consistency. Create immutable audit log entries in ver_logs table with complete verification context. Include optional storage of verification files for audit purposes with configurable retention policies.

### 7.5. Implement Batch Verification and Error Handling

**Status:** pending  
**Dependencies:** 7.4  

Add support for batch verification processing and comprehensive error handling with proper HTTP responses and logging

**Details:**

Implement batch verification endpoint that can process multiple documents in a single request. Add proper error handling for all failure scenarios including network issues, database errors, and file processing failures. Create detailed HTTP response codes and error messages. Implement rate limiting and request validation. Add comprehensive logging for debugging and monitoring. Include rollback mechanisms for partial batch failures.
