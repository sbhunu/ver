/**
 * Shared Types and Type Definitions
 * 
 * Central export point for all TypeScript types and interfaces
 */

export * from './entities'

// Re-export commonly used types for convenience
export type {
  UUID,
  Timestamp,
  Geometry,
  JsonValue,
  UserRole,
  DocumentStatus,
  VerificationStatus,
  ActionType,
  LogTargetType,
  SortOrder,
} from './entities'

export type {
  Profile,
  ProfileInsert,
  ProfileUpdate,
  Property,
  PropertyInsert,
  PropertyUpdate,
  Document,
  PendingDocument,
  HashedDocument,
  VerifiedDocument,
  RejectedDocument,
  FlaggedDocument,
  DocumentInsert,
  DocumentUpdate,
  DocumentHash,
  DocumentHashInsert,
  DocumentHashUpdate,
  Verification,
  VerifiedVerification,
  RejectedVerification,
  VerificationInsert,
  VerificationUpdate,
  DiscrepancyMetadata,
  AuditLog,
  AuditLogInsert,
  AuditLogUpdate,
  LogDetails,
  DocumentWithRelations,
  PropertyWithRelations,
  VerificationWithRelations,
  ProfileWithRelations,
  PaginationParams,
  PaginatedResponse,
  SortParams,
  FilterParams,
} from './entities'
