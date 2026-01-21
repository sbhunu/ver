# Task ID: 4

**Title:** Document Upload and Storage Service

**Status:** pending

**Dependencies:** 1, 2, 3

**Priority:** high

**Description:** Implement secure document upload to Supabase Storage with metadata capture and storage path management

**Details:**

Create upload API route using Next.js 16.* App Router server actions. Implement file upload to Supabase Storage bucket 'documents' with organized folder structure: /property-{id}/documents/{uuid}-{sanitized-filename}. Use @supabase/storage-js v2.6+ for file operations. Implement multipart upload for large files. Create ver_documents record with metadata (property_id, doc_number, uploader_id, storage_path). Add file type validation and virus scanning placeholder. Implement upload progress tracking using React hooks. Set up storage bucket policies for role-based access.

**Test Strategy:**

Integration tests for file upload with various file types and sizes. Test upload progress tracking. Verify storage bucket permissions prevent unauthorized access. Test upload failure scenarios (network interruption, invalid files). Load test with concurrent uploads.

## Subtasks

### 4.1. Create Supabase Storage Bucket and Policies

**Status:** pending  
**Dependencies:** None  

Set up the 'documents' storage bucket in Supabase with proper folder structure and role-based access policies

**Details:**

Create Supabase Storage bucket named 'documents' with organized folder structure /property-{id}/documents/{uuid}-{sanitized-filename}. Configure bucket policies for role-based access control allowing staff/verifier/chief_registrar/admin roles appropriate permissions. Set up RLS policies to ensure users can only access documents they have permission for based on their role and property assignments.

### 4.2. Implement File Upload API Route with Server Actions

**Status:** pending  
**Dependencies:** 4.1  

Create Next.js 16.* App Router server action for secure document upload with validation and metadata capture

**Details:**

Create server action in app/actions/upload-document.ts using Next.js 16.* App Router. Implement file type validation (PDF, DOC, DOCX) and size limits (max 50MB). Add virus scanning placeholder integration. Capture file metadata including property_id, doc_number, uploader_id, and generate UUID for unique naming. Sanitize filenames and create storage path following the defined structure.

### 4.3. Implement Multipart Upload with Progress Tracking

**Status:** pending  
**Dependencies:** 4.2  

Add support for large file uploads using Supabase Storage multipart upload with React hooks for progress tracking

**Details:**

Integrate @supabase/storage-js v2.6+ multipart upload functionality for files larger than 6MB. Create React hooks (useUploadProgress) to track upload progress and handle upload states (idle, uploading, success, error). Implement resumable uploads for network interruption recovery. Add upload cancellation functionality and cleanup of partial uploads.

### 4.4. Create Document Metadata Database Records

**Status:** pending  
**Dependencies:** 4.2  

Implement database operations to store document metadata in ver_documents table with proper relationships

**Details:**

Create database operations to insert records into ver_documents table with fields: property_id, doc_number, uploader_id, storage_path, file_size, mime_type, original_filename, upload_timestamp. Implement proper foreign key relationships and constraints. Add database triggers for automatic audit logging of document creation. Ensure atomic transactions for file upload and metadata storage.

### 4.5. Implement SHA-256 Hashing and Hash Storage

**Status:** pending  
**Dependencies:** 4.4  

Add SHA-256 hash generation for uploaded documents and store hashes in ver_document_hashes table for verification

**Details:**

Implement SHA-256 hash generation for uploaded files using Node.js crypto module. Create ver_document_hashes table records linking to ver_documents with hash value, algorithm type, and creation timestamp. For large files, implement streaming hash calculation to handle memory efficiently. Store multiple hash versions if document is updated, maintaining hash history for audit purposes.
