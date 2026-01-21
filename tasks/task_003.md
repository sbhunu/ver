# Task ID: 3

**Title:** Shared Types and Validation Layer

**Status:** pending

**Dependencies:** 1, 2

**Priority:** medium

**Description:** Create TypeScript types, Zod validation schemas, and error handling conventions for the application

**Details:**

Create lib/validation module using Zod v3.22+ for runtime validation. Define TypeScript interfaces for all database entities (Document, Property, Verification, etc.). Create validation schemas for file uploads (max 50MB, allowed MIME types: application/pdf, application/msword, application/vnd.openxmlformats-officedocument). Implement error handling with custom error classes (ValidationError, AuthorizationError, DocumentNotFoundError). Create utility functions for sanitizing file names and validating property numbers. Use discriminated unions for document status types.

**Test Strategy:**

Unit tests for all validation schemas with valid and invalid inputs. Test file upload validation with various file types and sizes. Verify error handling produces consistent error messages. Test TypeScript compilation with strict mode enabled.

## Subtasks

### 3.1. Create Core TypeScript Interfaces and Types

**Status:** pending  
**Dependencies:** None  

Define TypeScript interfaces for all database entities and application types

**Details:**

Create lib/types/index.ts with TypeScript interfaces for ver_profiles, ver_properties, ver_documents, ver_document_hashes, ver_verifications, and ver_logs tables. Define UserRole enum ('staff' | 'verifier' | 'chief_registrar' | 'admin'). Create discriminated unions for document status types (pending, verified, rejected). Define GeoJSON types for PostGIS geometry data. Include proper typing for UUID fields, timestamps, and nullable columns.

### 3.2. Implement Zod Validation Schemas

**Status:** pending  
**Dependencies:** 3.1  

Create comprehensive Zod validation schemas for all data types and API inputs

**Details:**

Create lib/validation/schemas.ts using Zod v3.22+. Define validation schemas for all database entities matching TypeScript interfaces. Create file upload validation schema with max 50MB size limit and allowed MIME types (application/pdf, application/msword, application/vnd.openxmlformats-officedocument). Include property number validation, email validation for user profiles, and GeoJSON validation for spatial data. Add custom refinements for business logic validation.

### 3.3. Create Custom Error Classes and Error Handling

**Status:** pending  
**Dependencies:** None  

Implement custom error classes and centralized error handling system

**Details:**

Create lib/errors/index.ts with custom error classes: ValidationError, AuthorizationError, DocumentNotFoundError, UploadError, and DatabaseError. Each error class should extend base Error with additional properties like errorCode, statusCode, and context. Implement error serialization for API responses. Create error boundary components for React error handling. Add logging integration for error tracking.

### 3.4. Build File Handling Utility Functions

**Status:** pending  
**Dependencies:** 3.2  

Create utility functions for file operations, sanitization, and validation

**Details:**

Create lib/utils/file.ts with functions for sanitizing file names (remove special characters, limit length), validating file extensions, generating secure file paths, and creating SHA-256 hashes for file verification. Include utilities for handling large file streaming, chunk processing for hash generation, and MIME type detection. Add functions for generating unique storage paths with UUID prefixes.

### 3.5. Create Validation Module Integration and API Helpers

**Status:** pending  
**Dependencies:** 3.1, 3.2, 3.3, 3.4  

Build the main validation module with API integration helpers and middleware

**Details:**

Create lib/validation/index.ts as the main module export combining all validation functionality. Build validateRequest() helper for API route validation, validateFileUpload() for file processing, and validateUserPermissions() for authorization checks. Create Next.js middleware integration for request validation. Include utility functions for parsing and validating form data, query parameters, and request bodies with proper error handling and response formatting.
