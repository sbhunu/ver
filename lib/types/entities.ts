/**
 * Core TypeScript Interfaces and Types
 * 
 * Defines TypeScript interfaces for all database entities and application types.
 * These types match the database schema defined in migrations.
 */

// ============================================================================
// Enum Types (matching database enums)
// ============================================================================

/**
 * User roles in the system
 */
export type UserRole = 'staff' | 'verifier' | 'chief_registrar' | 'admin'

/**
 * Document status values
 */
export type DocumentStatus = 'pending' | 'hashed' | 'verified' | 'rejected' | 'flagged'

/**
 * Verification status values
 */
export type VerificationStatus = 'verified' | 'rejected'

/**
 * Action types for audit logs
 */
export type ActionType = 
  | 'upload' 
  | 'hash' 
  | 'verify' 
  | 'delete' 
  | 'export' 
  | 'login' 
  | 'logout' 
  | 'update' 
  | 'create'

// ============================================================================
// Base Types
// ============================================================================

/**
 * UUID type alias
 */
export type UUID = string

/**
 * Timestamp type (ISO 8601 string)
 */
export type Timestamp = string

/**
 * PostGIS Geometry type (GeoJSON format)
 * For ver_properties.geom column
 */
export interface Geometry {
  type: 'Polygon' | 'Point' | 'LineString' | 'MultiPolygon' | 'MultiPoint' | 'MultiLineString'
  coordinates: number[] | number[][] | number[][][]
  crs?: {
    type: string
    properties: {
      name: string
    }
  }
}

/**
 * JSONB type for flexible metadata storage
 */
export type JsonValue = 
  | string 
  | number 
  | boolean 
  | null 
  | JsonValue[] 
  | { [key: string]: JsonValue }

// ============================================================================
// Profile Entity
// ============================================================================

/**
 * User profile entity (ver_profiles table)
 */
export interface Profile {
  id: UUID
  email: string
  role: UserRole
  created_at: Timestamp
  updated_at: Timestamp
}

/**
 * Profile insert type (for creating new profiles)
 */
export interface ProfileInsert {
  id: UUID
  email: string
  role?: UserRole  // Optional, defaults to 'staff' in database
  created_at?: Timestamp
  updated_at?: Timestamp
}

/**
 * Profile update type (for updating existing profiles)
 */
export interface ProfileUpdate {
  email?: string
  role?: UserRole
  updated_at?: Timestamp
}

// ============================================================================
// Property Entity
// ============================================================================

/**
 * Property status enum
 */
export type PropertyStatus = 'active' | 'inactive' | 'pending' | 'archived'

/**
 * Property entity (ver_properties table)
 */
export interface Property {
  id: UUID
  property_no: string
  address: string
  owner_name: string | null
  geom: Geometry | null  // PostGIS geometry (POLYGON or MULTIPOLYGON in EPSG:4326)
  area: number | null  // Area in square meters (computed from geometry)
  registration_date: string | null  // ISO date string
  status: PropertyStatus
  metadata: Record<string, unknown>  // JSONB metadata
  created_at: Timestamp
  updated_at: Timestamp
}

/**
 * Property insert type
 */
export interface PropertyInsert {
  id?: UUID  // Optional, defaults to gen_random_uuid()
  property_no: string
  address: string
  owner_name?: string | null
  geom?: Geometry | string | null  // PostGIS geometry, WKT string, or GeoJSON
  registration_date?: string | null  // ISO date string
  status?: PropertyStatus
  metadata?: Record<string, unknown>
  created_at?: Timestamp
  updated_at?: Timestamp
}

/**
 * Property update type
 */
export interface PropertyUpdate {
  property_no?: string
  address?: string
  owner_name?: string | null
  geom?: Geometry | string | null  // PostGIS geometry, WKT string, or GeoJSON
  registration_date?: string | null  // ISO date string
  status?: PropertyStatus
  metadata?: Record<string, unknown>
  updated_at?: Timestamp
}

// ============================================================================
// Document Entity
// ============================================================================

/**
 * Document entity (ver_documents table)
 * Uses discriminated union based on status
 */
export type Document = 
  | PendingDocument
  | HashedDocument
  | VerifiedDocument
  | RejectedDocument
  | FlaggedDocument

/**
 * Base document interface
 */
interface BaseDocument {
  id: UUID
  property_id: UUID
  doc_number: string
  uploader_id: UUID
  status: DocumentStatus
  storage_path: string
  file_size: number | null
  mime_type: string | null
  original_filename: string | null
  hash_computed_at: Timestamp | null
  created_at: Timestamp
  updated_at: Timestamp
}

/**
 * Pending document (not yet hashed)
 */
export interface PendingDocument extends BaseDocument {
  status: 'pending'
  hash_computed_at: null
}

/**
 * Hashed document (hash computed, awaiting verification)
 */
export interface HashedDocument extends BaseDocument {
  status: 'hashed'
  hash_computed_at: Timestamp
}

/**
 * Verified document (verification completed successfully)
 */
export interface VerifiedDocument extends BaseDocument {
  status: 'verified'
  hash_computed_at: Timestamp
}

/**
 * Rejected document (verification failed)
 */
export interface RejectedDocument extends BaseDocument {
  status: 'rejected'
  hash_computed_at: Timestamp | null
}

/**
 * Flagged document (requires attention)
 */
export interface FlaggedDocument extends BaseDocument {
  status: 'flagged'
  hash_computed_at: Timestamp | null
}

/**
 * Document insert type
 */
export interface DocumentInsert {
  id?: UUID
  property_id: UUID
  doc_number: string
  uploader_id: UUID
  status?: DocumentStatus  // Defaults to 'pending'
  storage_path: string
  file_size?: number | null
  mime_type?: string | null
  original_filename?: string | null
  hash_computed_at?: Timestamp | null
  created_at?: Timestamp
  updated_at?: Timestamp
}

/**
 * Document update type
 */
export interface DocumentUpdate {
  property_id?: UUID
  doc_number?: string
  status?: DocumentStatus
  storage_path?: string
  file_size?: number | null
  mime_type?: string | null
  original_filename?: string | null
  hash_computed_at?: Timestamp | null
  updated_at?: Timestamp
}

// ============================================================================
// Document Hash Entity
// ============================================================================

/**
 * Document hash entity (ver_document_hashes table)
 * Stores SHA-256 hashes with history support
 */
export interface DocumentHash {
  id: UUID
  document_id: UUID
  sha256_hash: string
  algorithm: string  // Default: 'SHA-256'
  created_at: Timestamp
}

/**
 * Document hash insert type
 */
export interface DocumentHashInsert {
  id?: UUID
  document_id: UUID
  sha256_hash: string
  algorithm?: string  // Defaults to 'SHA-256'
  created_at?: Timestamp
}

/**
 * Document hash update type
 * Note: Hashes are typically immutable, but type is provided for completeness
 */
export interface DocumentHashUpdate {
  sha256_hash?: string
  algorithm?: string
}

// ============================================================================
// Verification Entity
// ============================================================================

/**
 * Discrepancy metadata structure for verifications
 */
export interface DiscrepancyMetadata {
  file_size_difference?: number
  hash_mismatch?: boolean
  content_changes?: string[]
  other_discrepancies?: Record<string, unknown>
}

/**
 * Verification entity (ver_verifications table)
 * Uses discriminated union based on status
 */
export type Verification = VerifiedVerification | RejectedVerification

/**
 * Base verification interface
 */
interface BaseVerification {
  id: UUID
  document_id: UUID
  verifier_id: UUID
  status: VerificationStatus
  reason: string | null
  verification_storage_path: string | null
  discrepancy_metadata: DiscrepancyMetadata | null
  created_at: Timestamp
}

/**
 * Verified verification (document verified successfully)
 */
export interface VerifiedVerification extends BaseVerification {
  status: 'verified'
  reason: string | null  // Optional for verified
  discrepancy_metadata: null
}

/**
 * Rejected verification (document verification failed)
 */
export interface RejectedVerification extends BaseVerification {
  status: 'rejected'
  reason: string  // Required for rejections
  discrepancy_metadata: DiscrepancyMetadata | null
}

/**
 * Verification insert type
 */
export interface VerificationInsert {
  id?: UUID
  document_id: UUID
  verifier_id: UUID
  status: VerificationStatus
  reason?: string | null
  verification_storage_path?: string | null
  discrepancy_metadata?: DiscrepancyMetadata | null
  created_at?: Timestamp
}

/**
 * Verification update type
 * Note: Verifications are typically immutable, but type is provided for completeness
 */
export interface VerificationUpdate {
  reason?: string | null
  verification_storage_path?: string | null
  discrepancy_metadata?: DiscrepancyMetadata | null
}

// ============================================================================
// Audit Log Entity
// ============================================================================

/**
 * Target types for audit logs
 */
export type LogTargetType = 'document' | 'property' | 'verification' | 'profile' | 'hash' | string

/**
 * Action details structure for audit logs
 */
export interface LogDetails {
  [key: string]: JsonValue
  // Common fields:
  // - description?: string
  // - changes?: Record<string, { from: unknown; to: unknown }>
  // - metadata?: Record<string, unknown>
}

/**
 * Audit log entity (ver_logs table)
 * Immutable audit trail
 */
export interface AuditLog {
  id: UUID
  actor_id: UUID
  action: ActionType
  target_type: LogTargetType | null
  target_id: UUID | null
  ip_address: string | null  // INET type
  user_agent: string | null
  details: LogDetails
  created_at: Timestamp
}

/**
 * Audit log insert type
 */
export interface AuditLogInsert {
  id?: UUID
  actor_id: UUID
  action: ActionType
  target_type?: LogTargetType | null
  target_id?: UUID | null
  ip_address?: string | null
  user_agent?: string | null
  details?: LogDetails  // Defaults to '{}'::jsonb
  created_at?: Timestamp
}

/**
 * Audit log update type
 * Note: Audit logs are immutable - updates are not allowed
 */
export interface AuditLogUpdate {
  // Intentionally empty - logs are immutable
}

// ============================================================================
// Relationship Types
// ============================================================================

/**
 * Document with related entities
 */
export interface DocumentWithRelations {
  id: UUID
  property_id: UUID
  doc_number: string
  uploader_id: UUID
  status: DocumentStatus
  storage_path: string
  file_size: number | null
  mime_type: string | null
  original_filename: string | null
  hash_computed_at: Timestamp | null
  created_at: Timestamp
  updated_at: Timestamp
  property: Property
  uploader: Profile
  hashes?: DocumentHash[]
  verifications?: Verification[]
}

/**
 * Property with related entities
 */
export interface PropertyWithRelations {
  id: UUID
  property_no: string
  address: string
  geom: Geometry | null
  created_at: Timestamp
  updated_at: Timestamp
  documents?: Document[]
}

/**
 * Verification with related entities
 */
export interface VerificationWithRelations {
  id: UUID
  document_id: UUID
  verifier_id: UUID
  status: VerificationStatus
  reason: string | null
  verification_storage_path: string | null
  discrepancy_metadata: DiscrepancyMetadata | null
  created_at: Timestamp
  document: Document
  verifier: Profile
}

/**
 * Profile with related entities
 */
export interface ProfileWithRelations {
  id: UUID
  email: string
  role: UserRole
  created_at: Timestamp
  updated_at: Timestamp
  uploaded_documents?: Document[]
  verifications?: Verification[]
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number
  pageSize?: number
  limit?: number
  offset?: number
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Sort order
 */
export type SortOrder = 'asc' | 'desc'

/**
 * Sort parameters
 */
export interface SortParams {
  field: string
  order: SortOrder
}

/**
 * Filter parameters (generic)
 */
export interface FilterParams {
  [key: string]: unknown
}
