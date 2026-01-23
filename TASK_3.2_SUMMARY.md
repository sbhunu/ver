# Task 3.2: Implement Zod Validation Schemas - Summary

## ✅ Completed

### 1. Zod Installation

- ✅ Installed `zod@^3.22.0` (latest v3.22+)
- ✅ Added to project dependencies

### 2. Base Validation Schemas

**Created Core Schemas:**
- ✅ `uuidSchema` - UUID v4 validation
- ✅ `timestampSchema` - ISO 8601 datetime validation
- ✅ `emailSchema` - Email validation with lowercase/trim
- ✅ `propertyNumberSchema` - Property number validation (alphanumeric, hyphens, underscores, max 100 chars)
- ✅ `sha256HashSchema` - SHA-256 hash validation (64 hex characters)

### 3. Enum Schemas

**Created Enum Validation:**
- ✅ `userRoleSchema` - 'staff' | 'verifier' | 'chief_registrar' | 'admin'
- ✅ `documentStatusSchema` - 'pending' | 'hashed' | 'verified' | 'rejected' | 'flagged'
- ✅ `verificationStatusSchema` - 'verified' | 'rejected'
- ✅ `actionTypeSchema` - All audit log action types

### 4. File Upload Validation Schema

**File Upload Requirements:**
- ✅ **Max 50MB size limit**: `MAX_FILE_SIZE = 50 * 1024 * 1024` (50MB)
- ✅ **Allowed MIME types**:
  - `application/pdf`
  - `application/msword` (.doc)
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (.docx)
- ✅ **File extension validation**: Ensures extension matches MIME type
- ✅ **Filename sanitization**: Removes dangerous characters, normalizes spaces

**Schema Features:**
```typescript
export const fileUploadSchema = z.object({
  name: z.string().min(1),
  size: z.number().int().positive().max(MAX_FILE_SIZE),
  type: z.string().refine(type => ALLOWED_MIME_TYPES.includes(type)),
})
```

### 5. Property Number Validation

**Property Number Schema:**
- ✅ Minimum 1 character
- ✅ Maximum 100 characters
- ✅ Alphanumeric, hyphens, and underscores only
- ✅ Automatic trimming
- ✅ Custom regex validation: `/^[A-Za-z0-9\-_]+$/`

### 6. Email Validation

**Email Schema:**
- ✅ Standard email format validation
- ✅ Automatic lowercase conversion
- ✅ Automatic trimming
- ✅ Custom error messages

### 7. GeoJSON / PostGIS Geometry Validation

**Geometry Schema Features:**
- ✅ Supports all geometry types:
  - Polygon, Point, LineString
  - MultiPolygon, MultiPoint, MultiLineString
- ✅ Coordinate structure validation (matches geometry type)
- ✅ WGS84 (EPSG:4326) coordinate range validation:
  - Longitude: -180 to 180
  - Latitude: -90 to 90
- ✅ CRS (Coordinate Reference System) support
- ✅ Nested coordinate array validation

**Validation Refinements:**
```typescript
.refine(geom => {
  // Validates coordinate structure matches geometry type
  // Validates WGS84 coordinate ranges
})
```

### 8. Entity Validation Schemas

**All Database Entities Covered:**

**Profile:**
- ✅ `profileInsertSchema` - Insert validation
- ✅ `profileUpdateSchema` - Update validation
- ✅ `profileSchema` - Full entity validation

**Property:**
- ✅ `propertyInsertSchema` - Insert validation with property number validation
- ✅ `propertyUpdateSchema` - Update validation
- ✅ `propertySchema` - Full entity validation with geometry

**Document:**
- ✅ `documentInsertSchema` - Insert validation with MIME type validation
- ✅ `documentUpdateSchema` - Update validation
- ✅ `documentSchema` - Discriminated union based on status (5 variants)

**Document Hash:**
- ✅ `documentHashInsertSchema` - Insert validation with SHA-256 validation
- ✅ `documentHashUpdateSchema` - Update validation
- ✅ `documentHashSchema` - Full entity validation

**Verification:**
- ✅ `verificationInsertSchema` - Insert validation with business logic:
  - Reason required for rejections
  - Discrepancy metadata must be null for verified
- ✅ `verificationUpdateSchema` - Update validation
- ✅ `verificationSchema` - Discriminated union (2 variants)

**Audit Log:**
- ✅ `auditLogInsertSchema` - Insert validation with IP address validation
- ✅ `auditLogUpdateSchema` - Empty (logs are immutable)
- ✅ `auditLogSchema` - Full entity validation

### 9. Custom Business Logic Refinements

**Verification Business Logic:**
- ✅ **Reason required for rejections**: Custom refinement ensures `reason` is provided when `status === 'rejected'`
- ✅ **Discrepancy metadata validation**: Must be `null` for verified status

**File Upload Business Logic:**
- ✅ **Extension-MIME type matching**: Validates file extension matches declared MIME type
- ✅ **Filename sanitization**: Removes path separators and dangerous characters

**Geometry Business Logic:**
- ✅ **Coordinate structure validation**: Ensures coordinates match geometry type
- ✅ **WGS84 range validation**: Validates longitude/latitude within valid ranges

### 10. Type Exports

**Inferred Types:**
- ✅ All entity types inferred from schemas using `z.infer<>`
- ✅ Type-safe validation with automatic TypeScript type generation
- ✅ Full type compatibility with `lib/types/entities.ts`

## 📁 File Structure

```
lib/validation/
├── schemas.ts    (703 lines) - 32+ validation schemas
└── index.ts      (45 lines)  - Central export point
```

## 🎯 Key Features

### Comprehensive Validation

**All Requirements Met:**
- ✅ Zod v3.22+ used throughout
- ✅ All database entities have validation schemas
- ✅ File upload validation (50MB max, specific MIME types)
- ✅ Property number validation
- ✅ Email validation
- ✅ GeoJSON/PostGIS geometry validation
- ✅ Custom business logic refinements

### Type Safety

- ✅ All schemas infer TypeScript types
- ✅ Discriminated unions for Document and Verification
- ✅ Type-safe validation with compile-time checks
- ✅ Full compatibility with existing type definitions

### Error Handling

- ✅ Custom error messages for all validations
- ✅ Path-specific error messages for nested validations
- ✅ Clear, user-friendly error messages

### Business Logic Validation

- ✅ Verification reason required for rejections
- ✅ Discrepancy metadata constraints
- ✅ File extension-MIME type matching
- ✅ Coordinate range validation for geometries

## 📝 Usage Examples

### File Upload Validation

```typescript
import { fileUploadSchema, MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from '@/lib/validation'

const file = {
  name: 'document.pdf',
  size: 1024 * 1024, // 1MB
  type: 'application/pdf'
}

const result = fileUploadSchema.safeParse(file)
if (result.success) {
  // File is valid
} else {
  // Handle validation errors
  console.error(result.error.errors)
}
```

### Property Number Validation

```typescript
import { propertyNumberSchema } from '@/lib/validation'

const propertyNo = 'PROP-123-ABC'
const result = propertyNumberSchema.safeParse(propertyNo)
// Validates: alphanumeric, hyphens, underscores, max 100 chars
```

### Email Validation

```typescript
import { emailSchema } from '@/lib/validation'

const email = '  User@Example.COM  '
const result = emailSchema.parse(email)
// Result: 'user@example.com' (lowercased and trimmed)
```

### Geometry Validation

```typescript
import { geometrySchema } from '@/lib/validation'

const geometry = {
  type: 'Polygon',
  coordinates: [[[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]]],
  crs: {
    type: 'name',
    properties: { name: 'EPSG:4326' }
  }
}

const result = geometrySchema.safeParse(geometry)
// Validates: structure, coordinate ranges, CRS
```

### Document Insert Validation

```typescript
import { documentInsertSchema } from '@/lib/validation'

const document = {
  property_id: 'uuid-here',
  doc_number: 'DOC-001',
  uploader_id: 'user-uuid',
  storage_path: '/storage/path.pdf',
  mime_type: 'application/pdf',
  file_size: 1024 * 1024
}

const result = documentInsertSchema.safeParse(document)
// Validates: UUIDs, MIME type, file size, document number
```

### Verification with Business Logic

```typescript
import { verificationInsertSchema } from '@/lib/validation'

// This will fail - reason required for rejections
const invalid = {
  document_id: 'uuid',
  verifier_id: 'uuid',
  status: 'rejected',
  // reason missing
}

// This will pass
const valid = {
  document_id: 'uuid',
  verifier_id: 'uuid',
  status: 'rejected',
  reason: 'Document hash mismatch'
}
```

## 🔗 Schema Relationships

### Entity Schema Hierarchy

```
Base Schemas
  ├── uuidSchema, timestampSchema, emailSchema
  ├── propertyNumberSchema, sha256HashSchema
  └── Enum schemas (UserRole, DocumentStatus, etc.)

File Upload
  ├── fileUploadSchema (50MB, MIME types)
  └── sanitizedFilenameSchema

Geometry
  └── geometrySchema (GeoJSON, WGS84 validation)

Entity Schemas
  ├── Profile (Insert, Update, Full)
  ├── Property (Insert, Update, Full)
  ├── Document (Insert, Update, Discriminated Union)
  ├── DocumentHash (Insert, Update, Full)
  ├── Verification (Insert, Update, Discriminated Union)
  └── AuditLog (Insert, Update, Full)
```

## ✅ Task 3.2 Status: Complete

All requirements have been implemented:
- ✅ Zod v3.22+ installed and used
- ✅ Validation schemas for all database entities
- ✅ File upload validation (50MB max, specific MIME types)
- ✅ Property number validation
- ✅ Email validation
- ✅ GeoJSON/PostGIS geometry validation
- ✅ Custom business logic refinements
- ✅ Type-safe validation with inferred types
- ✅ Comprehensive error handling

The validation module is complete and ready for use throughout the application. All schemas match the TypeScript interfaces and provide runtime validation with comprehensive error messages.
