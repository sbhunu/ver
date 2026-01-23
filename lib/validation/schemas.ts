/**
 * Zod Validation Schemas
 * 
 * Comprehensive validation schemas for all database entities and API inputs.
 * Uses Zod v3.22+ for runtime validation.
 */

import { z } from 'zod'

// ============================================================================
// Base Schemas
// ============================================================================

/**
 * UUID validation schema
 * Validates UUID v4 format
 */
export const uuidSchema = z.string().uuid({
  message: 'Must be a valid UUID',
})

/**
 * Timestamp validation schema (ISO 8601)
 */
export const timestampSchema = z.string().datetime({
  message: 'Must be a valid ISO 8601 datetime string',
})

/**
 * Email validation schema
 * Validates email format with custom error message
 */
export const emailSchema = z
  .string()
  .email({
    message: 'Must be a valid email address',
  })
  .toLowerCase()
  .trim()

/**
 * Property number validation schema
 * Validates property number format (alphanumeric, hyphens, underscores)
 */
export const propertyNumberSchema = z
  .string()
  .min(1, 'Property number is required')
  .max(100, 'Property number must be 100 characters or less')
  .regex(
    /^[A-Za-z0-9\-_]+$/,
    'Property number can only contain letters, numbers, hyphens, and underscores'
  )
  .trim()

/**
 * SHA-256 hash validation schema
 * Validates 64-character hexadecimal string
 */
export const sha256HashSchema = z
  .string()
  .length(64, 'SHA-256 hash must be exactly 64 characters')
  .regex(/^[a-f0-9]+$/i, 'SHA-256 hash must be hexadecimal')

// ============================================================================
// Enum Schemas
// ============================================================================

/**
 * User role enum schema
 */
export const userRoleSchema = z.enum(['staff', 'verifier', 'chief_registrar', 'admin'], {
  errorMap: () => ({ message: 'Invalid user role' }),
})

/**
 * Document status enum schema
 */
export const documentStatusSchema = z.enum(
  ['pending', 'hashed', 'verified', 'rejected', 'flagged'],
  {
    errorMap: () => ({ message: 'Invalid document status' }),
  }
)

/**
 * Verification status enum schema
 */
export const verificationStatusSchema = z.enum(['verified', 'rejected'], {
  errorMap: () => ({ message: 'Invalid verification status' }),
})

/**
 * Action type enum schema
 */
export const actionTypeSchema = z.enum(
  ['upload', 'hash', 'verify', 'delete', 'export', 'login', 'logout', 'update', 'create'],
  {
    errorMap: () => ({ message: 'Invalid action type' }),
  }
)

// ============================================================================
// File Upload Validation
// ============================================================================

/**
 * Allowed MIME types for document uploads
 */
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
] as const

/**
 * Maximum file size: 50MB in bytes
 */
export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

/**
 * File upload validation schema
 * Validates file size (max 50MB) and MIME type
 */
export const fileUploadSchema = z
  .object({
    name: z.string().min(1, 'Filename is required'),
    size: z
      .number()
      .int()
      .positive('File size must be positive')
      .max(MAX_FILE_SIZE, `File size must not exceed ${MAX_FILE_SIZE / 1024 / 1024}MB`),
    type: z
      .string()
      .refine(
        (type) => ALLOWED_MIME_TYPES.includes(type as typeof ALLOWED_MIME_TYPES[number]),
        {
          message: `File type must be one of: ${ALLOWED_MIME_TYPES.join(', ')}`,
        }
      ),
  })
  .refine(
    (file) => {
      // Additional validation: check file extension matches MIME type
      const extension = file.name.split('.').pop()?.toLowerCase()
      const mimeType = file.type

      if (mimeType === 'application/pdf' && extension !== 'pdf') {
        return false
      }
      if (mimeType === 'application/msword' && extension !== 'doc') {
        return false
      }
      if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
        extension !== 'docx'
      ) {
        return false
      }

      return true
    },
    {
      message: 'File extension does not match MIME type',
    }
  )

/**
 * File name sanitization schema
 * Removes dangerous characters and normalizes filename
 */
export const sanitizedFilenameSchema = z
  .string()
  .min(1, 'Filename is required')
  .max(255, 'Filename must be 255 characters or less')
  .transform((name) => {
    // Remove path separators and dangerous characters
    return name
      .replace(/[\/\\?%*:|"<>]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .trim()
  })

// ============================================================================
// GeoJSON / PostGIS Geometry Validation
// ============================================================================

/**
 * GeoJSON coordinate schema
 * Validates coordinate arrays
 */
const coordinateSchema: z.ZodType<number | number[] | number[][] | number[][][]> = z.union([
  z.number(), // Point: [x, y]
  z.array(z.number()), // LineString: [[x, y], ...]
  z.array(z.array(z.number())), // Polygon: [[[x, y], ...], ...]
  z.array(z.array(z.array(z.number()))), // MultiPolygon: [[[[x, y], ...], ...], ...]
])

/**
 * GeoJSON CRS (Coordinate Reference System) schema
 */
const crsSchema = z
  .object({
    type: z.string(),
    properties: z.object({
      name: z.string(),
    }),
  })
  .optional()

/**
 * GeoJSON Geometry schema
 * Validates PostGIS geometry data in GeoJSON format
 */
export const geometrySchema = z
  .object({
    type: z.enum([
      'Polygon',
      'Point',
      'LineString',
      'MultiPolygon',
      'MultiPoint',
      'MultiLineString',
    ]),
    coordinates: coordinateSchema,
    crs: crsSchema,
  })
  .refine(
    (geom) => {
      // Validate coordinate structure matches geometry type
      const { type, coordinates } = geom

      if (type === 'Point') {
        return Array.isArray(coordinates) && coordinates.length >= 2 && coordinates.length <= 3
      }
      if (type === 'LineString') {
        return (
          Array.isArray(coordinates) &&
          Array.isArray(coordinates[0]) &&
          coordinates[0].length >= 2
        )
      }
      if (type === 'Polygon') {
        return (
          Array.isArray(coordinates) &&
          Array.isArray(coordinates[0]) &&
          Array.isArray(coordinates[0][0]) &&
          coordinates[0][0].length >= 2
        )
      }
      // Multi types follow similar patterns
      return true
    },
    {
      message: 'Coordinate structure does not match geometry type',
    }
  )
  .refine(
    (geom) => {
      // Validate longitude/latitude ranges for WGS84 (EPSG:4326)
      const validateCoordinates = (coords: any): boolean => {
        if (typeof coords === 'number') {
          return true // Skip single numbers in nested arrays
        }
        if (Array.isArray(coords)) {
          if (coords.length >= 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
            const [lng, lat] = coords
            return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90
          }
          return coords.every(validateCoordinates)
        }
        return true
      }

      return validateCoordinates(geom.coordinates)
    },
    {
      message: 'Coordinates must be valid WGS84 (longitude: -180 to 180, latitude: -90 to 90)',
    }
  )

// ============================================================================
// Profile Schemas
// ============================================================================

/**
 * Profile insert schema
 */
export const profileInsertSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  role: userRoleSchema.optional().default('staff'),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
})

/**
 * Profile update schema
 */
export const profileUpdateSchema = z.object({
  email: emailSchema.optional(),
  role: userRoleSchema.optional(),
  updated_at: timestampSchema.optional(),
})

/**
 * Profile schema (full entity)
 */
export const profileSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  role: userRoleSchema,
  created_at: timestampSchema,
  updated_at: timestampSchema,
})

// ============================================================================
// Property Schemas
// ============================================================================

/**
 * Property status schema
 */
export const propertyStatusSchema = z.enum(['active', 'inactive', 'pending', 'archived'])

/**
 * Property insert schema
 */
export const propertyInsertSchema = z.object({
  id: uuidSchema.optional(),
  property_no: propertyNumberSchema,
  address: z.string().min(1, 'Address is required').max(500, 'Address must be 500 characters or less').trim(),
  owner_name: z.string().max(200).trim().nullable().optional(),
  geom: z.union([geometrySchema, z.string()]).nullable().optional(), // Accepts GeoJSON object or WKT string
  registration_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), // ISO date format
  status: propertyStatusSchema.optional().default('active'),
  metadata: z.record(z.unknown()).optional().default({}),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
})

/**
 * Property update schema
 */
export const propertyUpdateSchema = z.object({
  property_no: propertyNumberSchema.optional(),
  address: z.string().min(1).max(500).trim().optional(),
  owner_name: z.string().max(200).trim().nullable().optional(),
  geom: z.union([geometrySchema, z.string()]).nullable().optional(), // Accepts GeoJSON object or WKT string
  registration_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), // ISO date format
  status: propertyStatusSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
  updated_at: timestampSchema.optional(),
})

/**
 * Property schema (full entity)
 */
export const propertySchema = z.object({
  id: uuidSchema,
  property_no: propertyNumberSchema,
  address: z.string().min(1).max(500).trim(),
  owner_name: z.string().max(200).trim().nullable(),
  geom: geometrySchema.nullable(),
  area: z.number().positive().nullable(),
  registration_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  status: propertyStatusSchema,
  metadata: z.record(z.unknown()),
  created_at: timestampSchema,
  updated_at: timestampSchema,
})

// ============================================================================
// Document Schemas
// ============================================================================

/**
 * Document insert schema
 */
export const documentInsertSchema = z.object({
  id: uuidSchema.optional(),
  property_id: uuidSchema,
  doc_number: z
    .string()
    .min(1, 'Document number is required')
    .max(100, 'Document number must be 100 characters or less')
    .trim(),
  uploader_id: uuidSchema,
  status: documentStatusSchema.optional().default('pending'),
  storage_path: z.string().min(1, 'Storage path is required').max(500),
  file_size: z.number().int().positive().nullable().optional(),
  mime_type: z
    .string()
    .refine(
      (type) => !type || ALLOWED_MIME_TYPES.includes(type as typeof ALLOWED_MIME_TYPES[number]),
      {
        message: `MIME type must be one of: ${ALLOWED_MIME_TYPES.join(', ')}`,
      }
    )
    .nullable()
    .optional(),
  original_filename: sanitizedFilenameSchema.nullable().optional(),
  hash_computed_at: timestampSchema.nullable().optional(),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
})

/**
 * Document update schema
 */
export const documentUpdateSchema = z.object({
  property_id: uuidSchema.optional(),
  doc_number: z.string().min(1).max(100).trim().optional(),
  status: documentStatusSchema.optional(),
  storage_path: z.string().min(1).max(500).optional(),
  file_size: z.number().int().positive().nullable().optional(),
  mime_type: z
    .string()
    .refine(
      (type) => !type || ALLOWED_MIME_TYPES.includes(type as typeof ALLOWED_MIME_TYPES[number]),
      {
        message: `MIME type must be one of: ${ALLOWED_MIME_TYPES.join(', ')}`,
      }
    )
    .nullable()
    .optional(),
  original_filename: sanitizedFilenameSchema.nullable().optional(),
  hash_computed_at: timestampSchema.nullable().optional(),
  updated_at: timestampSchema.optional(),
})

/**
 * Document schema (full entity)
 * Uses discriminated union based on status
 */
export const documentSchema = z.discriminatedUnion('status', [
  // Pending document
  z.object({
    id: uuidSchema,
    property_id: uuidSchema,
    doc_number: z.string().min(1).max(100),
    uploader_id: uuidSchema,
    status: z.literal('pending'),
    storage_path: z.string().min(1),
    file_size: z.number().int().positive().nullable(),
    mime_type: z.string().nullable(),
    original_filename: z.string().nullable(),
    hash_computed_at: z.null(),
    created_at: timestampSchema,
    updated_at: timestampSchema,
  }),
  // Hashed document
  z.object({
    id: uuidSchema,
    property_id: uuidSchema,
    doc_number: z.string().min(1).max(100),
    uploader_id: uuidSchema,
    status: z.literal('hashed'),
    storage_path: z.string().min(1),
    file_size: z.number().int().positive().nullable(),
    mime_type: z.string().nullable(),
    original_filename: z.string().nullable(),
    hash_computed_at: timestampSchema,
    created_at: timestampSchema,
    updated_at: timestampSchema,
  }),
  // Verified document
  z.object({
    id: uuidSchema,
    property_id: uuidSchema,
    doc_number: z.string().min(1).max(100),
    uploader_id: uuidSchema,
    status: z.literal('verified'),
    storage_path: z.string().min(1),
    file_size: z.number().int().positive().nullable(),
    mime_type: z.string().nullable(),
    original_filename: z.string().nullable(),
    hash_computed_at: timestampSchema,
    created_at: timestampSchema,
    updated_at: timestampSchema,
  }),
  // Rejected document
  z.object({
    id: uuidSchema,
    property_id: uuidSchema,
    doc_number: z.string().min(1).max(100),
    uploader_id: uuidSchema,
    status: z.literal('rejected'),
    storage_path: z.string().min(1),
    file_size: z.number().int().positive().nullable(),
    mime_type: z.string().nullable(),
    original_filename: z.string().nullable(),
    hash_computed_at: timestampSchema.nullable(),
    created_at: timestampSchema,
    updated_at: timestampSchema,
  }),
  // Flagged document
  z.object({
    id: uuidSchema,
    property_id: uuidSchema,
    doc_number: z.string().min(1).max(100),
    uploader_id: uuidSchema,
    status: z.literal('flagged'),
    storage_path: z.string().min(1),
    file_size: z.number().int().positive().nullable(),
    mime_type: z.string().nullable(),
    original_filename: z.string().nullable(),
    hash_computed_at: timestampSchema.nullable(),
    created_at: timestampSchema,
    updated_at: timestampSchema,
  }),
])

// ============================================================================
// Document Hash Schemas
// ============================================================================

/**
 * Document hash insert schema
 */
export const documentHashInsertSchema = z.object({
  id: uuidSchema.optional(),
  document_id: uuidSchema,
  sha256_hash: sha256HashSchema,
  algorithm: z.string().default('SHA-256'),
  created_at: timestampSchema.optional(),
})

/**
 * Document hash update schema
 */
export const documentHashUpdateSchema = z.object({
  sha256_hash: sha256HashSchema.optional(),
  algorithm: z.string().optional(),
})

/**
 * Document hash schema (full entity)
 */
export const documentHashSchema = z.object({
  id: uuidSchema,
  document_id: uuidSchema,
  sha256_hash: sha256HashSchema,
  algorithm: z.string(),
  created_at: timestampSchema,
})

// ============================================================================
// Verification Schemas
// ============================================================================

/**
 * Discrepancy metadata schema
 */
export const discrepancyMetadataSchema = z.object({
  file_size_difference: z.number().optional(),
  hash_mismatch: z.boolean().optional(),
  content_changes: z.array(z.string()).optional(),
  other_discrepancies: z.record(z.unknown()).optional(),
})

/**
 * Verification insert schema
 * Includes business logic: reason required for rejections
 */
export const verificationInsertSchema = z
  .object({
    id: uuidSchema.optional(),
    document_id: uuidSchema,
    verifier_id: uuidSchema,
    status: verificationStatusSchema,
    reason: z.string().max(1000).nullable().optional(),
    verification_storage_path: z.string().max(500).nullable().optional(),
    discrepancy_metadata: discrepancyMetadataSchema.nullable().optional(),
    created_at: timestampSchema.optional(),
  })
  .refine(
    (data) => {
      // Reason is required for rejections
      if (data.status === 'rejected' && !data.reason) {
        return false
      }
      return true
    },
    {
      message: 'Reason is required when status is rejected',
      path: ['reason'],
    }
  )
  .refine(
    (data) => {
      // Discrepancy metadata should be null for verified status
      if (data.status === 'verified' && data.discrepancy_metadata !== null) {
        return false
      }
      return true
    },
    {
      message: 'Discrepancy metadata must be null for verified status',
      path: ['discrepancy_metadata'],
    }
  )

/**
 * Verification update schema
 */
export const verificationUpdateSchema = z.object({
  reason: z.string().max(1000).nullable().optional(),
  verification_storage_path: z.string().max(500).nullable().optional(),
  discrepancy_metadata: discrepancyMetadataSchema.nullable().optional(),
})

/**
 * Verification schema (full entity)
 * Uses discriminated union based on status
 */
export const verificationSchema = z.discriminatedUnion('status', [
  // Verified verification
  z.object({
    id: uuidSchema,
    document_id: uuidSchema,
    verifier_id: uuidSchema,
    status: z.literal('verified'),
    reason: z.string().max(1000).nullable(),
    verification_storage_path: z.string().max(500).nullable(),
    discrepancy_metadata: z.null(),
    created_at: timestampSchema,
  }),
  // Rejected verification
  z.object({
    id: uuidSchema,
    document_id: uuidSchema,
    verifier_id: uuidSchema,
    status: z.literal('rejected'),
    reason: z.string().min(1, 'Reason is required for rejections').max(1000),
    verification_storage_path: z.string().max(500).nullable(),
    discrepancy_metadata: discrepancyMetadataSchema.nullable(),
    created_at: timestampSchema,
  }),
])

// ============================================================================
// Audit Log Schemas
// ============================================================================

/**
 * Log details schema (JSONB)
 */
export const logDetailsSchema = z.record(z.unknown()).default({})

/**
 * Audit log insert schema
 */
export const auditLogInsertSchema = z.object({
  id: uuidSchema.optional(),
  actor_id: uuidSchema,
  action: actionTypeSchema,
  target_type: z.string().max(50).nullable().optional(),
  target_id: uuidSchema.nullable().optional(),
  ip_address: z
    .string()
    .ip({ version: 'v4', message: 'Must be a valid IPv4 address' })
    .nullable()
    .optional(),
  user_agent: z.string().max(500).nullable().optional(),
  details: logDetailsSchema.optional(),
  created_at: timestampSchema.optional(),
})

/**
 * Audit log update schema
 * Note: Logs are immutable, but schema provided for completeness
 */
export const auditLogUpdateSchema = z.object({}).strict()

/**
 * Audit log schema (full entity)
 */
export const auditLogSchema = z.object({
  id: uuidSchema,
  actor_id: uuidSchema,
  action: actionTypeSchema,
  target_type: z.string().max(50).nullable(),
  target_id: uuidSchema.nullable(),
  ip_address: z.string().ip().nullable(),
  user_agent: z.string().max(500).nullable(),
  details: logDetailsSchema,
  created_at: timestampSchema,
})

// ============================================================================
// Type Exports (Inferred from Schemas)
// ============================================================================

export type ProfileInsert = z.infer<typeof profileInsertSchema>
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>
export type Profile = z.infer<typeof profileSchema>

export type PropertyInsert = z.infer<typeof propertyInsertSchema>
export type PropertyUpdate = z.infer<typeof propertyUpdateSchema>
export type Property = z.infer<typeof propertySchema>

export type DocumentInsert = z.infer<typeof documentInsertSchema>
export type DocumentUpdate = z.infer<typeof documentUpdateSchema>
export type Document = z.infer<typeof documentSchema>

export type DocumentHashInsert = z.infer<typeof documentHashInsertSchema>
export type DocumentHashUpdate = z.infer<typeof documentHashUpdateSchema>
export type DocumentHash = z.infer<typeof documentHashSchema>

export type VerificationInsert = z.infer<typeof verificationInsertSchema>
export type VerificationUpdate = z.infer<typeof verificationUpdateSchema>
export type Verification = z.infer<typeof verificationSchema>

export type AuditLogInsert = z.infer<typeof auditLogInsertSchema>
export type AuditLogUpdate = z.infer<typeof auditLogUpdateSchema>
export type AuditLog = z.infer<typeof auditLogSchema>

export type DiscrepancyMetadata = z.infer<typeof discrepancyMetadataSchema>
export type FileUpload = z.infer<typeof fileUploadSchema>
export type Geometry = z.infer<typeof geometrySchema>
