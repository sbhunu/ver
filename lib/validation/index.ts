/**
 * Validation Module
 * 
 * Central export point for all validation schemas, utilities, and API helpers
 */

// Export all schemas
export * from './schemas'

// Export API helpers
export * from './api-helpers'

// Export middleware
export * from './middleware'

// Re-export commonly used schemas for convenience
export {
  uuidSchema,
  timestampSchema,
  emailSchema,
  propertyNumberSchema,
  sha256HashSchema,
  userRoleSchema,
  documentStatusSchema,
  verificationStatusSchema,
  actionTypeSchema,
  fileUploadSchema,
  sanitizedFilenameSchema,
  geometrySchema,
  profileInsertSchema,
  profileUpdateSchema,
  profileSchema,
  propertyInsertSchema,
  propertyUpdateSchema,
  propertySchema,
  propertyStatusSchema,
  documentInsertSchema,
  documentUpdateSchema,
  documentSchema,
  documentHashInsertSchema,
  documentHashUpdateSchema,
  documentHashSchema,
  verificationInsertSchema,
  verificationUpdateSchema,
  verificationSchema,
  auditLogInsertSchema,
  auditLogUpdateSchema,
  auditLogSchema,
  discrepancyMetadataSchema,
  logDetailsSchema,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from './schemas'

// Re-export API helper functions for convenience
export {
  validateRequest,
  validateQueryParams,
  validateFormData,
  validateFileUpload,
  validateFileUploadWithHash,
  validateUserPermissions,
  validateUserPermissionsWithCheck,
  validateRequestWithPermissions,
  type ValidationResult,
  type ValidationErrorResult,
  type ValidationResponse,
  type FileUploadResult,
  type FileUploadErrorResult,
  type FileUploadValidationResponse,
  type FileUploadWithHashResult,
  type FileUploadWithHashErrorResult,
  type FileUploadWithHashResponse,
  type PermissionValidationResult,
  type PermissionValidationErrorResult,
  type PermissionValidationResponse,
} from './api-helpers'

// Re-export middleware functions
export {
  createValidationMiddleware,
  validateApiRequest,
  type ValidationMiddlewareOptions,
} from './middleware'
