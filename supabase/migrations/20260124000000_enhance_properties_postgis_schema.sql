-- Enhance ver_properties table with PostGIS spatial data support
-- Task 8.1: Create PostGIS Property Database Schema
-- Adds missing fields, geometry validation, and spatial constraints

-- ============================================================================
-- Add missing columns to ver_properties table
-- ============================================================================

-- Add owner_name column
ALTER TABLE ver_properties 
ADD COLUMN IF NOT EXISTS owner_name TEXT;

-- Add area column (computed from geometry, stored in square meters)
ALTER TABLE ver_properties 
ADD COLUMN IF NOT EXISTS area DOUBLE PRECISION;

-- Add registration_date column
ALTER TABLE ver_properties 
ADD COLUMN IF NOT EXISTS registration_date DATE;

-- Add status column (enum for property status)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'property_status') THEN
        CREATE TYPE property_status AS ENUM ('active', 'inactive', 'pending', 'archived');
    END IF;
END $$;

ALTER TABLE ver_properties 
ADD COLUMN IF NOT EXISTS status property_status DEFAULT 'active';

-- Add metadata JSONB column
ALTER TABLE ver_properties 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- Update geometry column to support POLYGON and MULTIPOLYGON
-- ============================================================================

-- The existing geometry column is GEOMETRY(POLYGON, 4326)
-- We need to change it to GEOMETRY(GEOMETRY, 4326) to support both POLYGON and MULTIPOLYGON
-- However, PostGIS doesn't allow direct type change, so we'll:
-- 1. Add a new column with the correct type
-- 2. Copy data
-- 3. Drop old column
-- 4. Rename new column

DO $$
BEGIN
    -- Check if we need to update the geometry column type
    -- If the column type is already GEOMETRY (not restricted to POLYGON), we're good
    -- Otherwise, we need to change it
    
    -- First, check current column type
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ver_properties' 
        AND column_name = 'geom'
        AND data_type = 'USER-DEFINED'
    ) THEN
        -- Column exists, check if we need to change the type
        -- We'll use ALTER COLUMN to change the type constraint
        -- PostGIS allows changing from GEOMETRY(POLYGON, 4326) to GEOMETRY(GEOMETRY, 4326)
        -- by using ALTER COLUMN ... TYPE GEOMETRY(GEOMETRY, 4326)
        
        -- Change geometry column to accept both POLYGON and MULTIPOLYGON
        -- Using GEOMETRY(GEOMETRY, 4326) allows any geometry type, but we'll validate in trigger
        ALTER TABLE ver_properties 
        ALTER COLUMN geom TYPE GEOMETRY(GEOMETRY, 4326) 
        USING ST_SetSRID(geom, 4326);
    END IF;
END $$;

-- Ensure geometry column has correct SRID (EPSG:4326)
-- Update any existing geometries to ensure they're in EPSG:4326
UPDATE ver_properties 
SET geom = ST_SetSRID(geom, 4326) 
WHERE geom IS NOT NULL AND ST_SRID(geom) != 4326;

-- ============================================================================
-- Create function to compute area from geometry
-- ============================================================================

CREATE OR REPLACE FUNCTION compute_property_area()
RETURNS TRIGGER AS $$
BEGIN
    -- Compute area in square meters using PostGIS ST_Area
    -- ST_Area with geography returns area in square meters
    -- We convert geometry to geography for accurate area calculation
    IF NEW.geom IS NOT NULL THEN
        -- Use ST_Area with geography for accurate area in square meters
        -- For EPSG:4326, we need to cast to geography for accurate area calculation
        NEW.area = ST_Area(NEW.geom::geography);
    ELSE
        NEW.area = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically compute area when geometry is set or updated
DROP TRIGGER IF EXISTS compute_property_area_trigger ON ver_properties;
CREATE TRIGGER compute_property_area_trigger
    BEFORE INSERT OR UPDATE OF geom ON ver_properties
    FOR EACH ROW
    EXECUTE FUNCTION compute_property_area();

-- ============================================================================
-- Create function to validate geometry
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_property_geometry()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure geometry is not null (if required)
    -- For now, we allow NULL geometries (properties without spatial data)
    
    IF NEW.geom IS NOT NULL THEN
        -- Validate SRID is 4326 (WGS84)
        IF ST_SRID(NEW.geom) != 4326 THEN
            RAISE EXCEPTION 'Geometry SRID must be 4326 (WGS84). Found: %', ST_SRID(NEW.geom);
        END IF;
        
        -- Validate geometry type is POLYGON or MULTIPOLYGON
        IF NOT (ST_GeometryType(NEW.geom) IN ('ST_Polygon', 'ST_MultiPolygon')) THEN
            RAISE EXCEPTION 'Geometry type must be POLYGON or MULTIPOLYGON. Found: %', ST_GeometryType(NEW.geom);
        END IF;
        
        -- Validate geometry is valid (not self-intersecting, etc.)
        IF NOT ST_IsValid(NEW.geom) THEN
            RAISE EXCEPTION 'Geometry is not valid: %', ST_IsValidReason(NEW.geom);
        END IF;
        
        -- Ensure geometry is not empty
        IF ST_IsEmpty(NEW.geom) THEN
            RAISE EXCEPTION 'Geometry cannot be empty';
        END IF;
        
        -- Ensure geometry is not too large (sanity check - adjust as needed)
        -- Check if bounding box is reasonable (within world bounds)
        DECLARE
            bbox BOX2D;
        BEGIN
            bbox := ST_Envelope(NEW.geom);
            -- Check if bounding box is within reasonable world bounds
            -- Longitude: -180 to 180, Latitude: -90 to 90
            IF bbox.xmin < -180 OR bbox.xmax > 180 OR bbox.ymin < -90 OR bbox.ymax > 90 THEN
                RAISE EXCEPTION 'Geometry bounding box is outside valid world coordinates';
            END IF;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate geometry
DROP TRIGGER IF EXISTS validate_property_geometry_trigger ON ver_properties;
CREATE TRIGGER validate_property_geometry_trigger
    BEFORE INSERT OR UPDATE OF geom ON ver_properties
    FOR EACH ROW
    EXECUTE FUNCTION validate_property_geometry();

-- ============================================================================
-- Create function to standardize geometry coordinate system
-- ============================================================================

CREATE OR REPLACE FUNCTION standardize_property_geometry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.geom IS NOT NULL THEN
        -- Ensure SRID is 4326
        IF ST_SRID(NEW.geom) != 4326 THEN
            -- Transform to 4326 if needed
            NEW.geom := ST_Transform(NEW.geom, 4326);
        END IF;
        
        -- Ensure geometry is valid (make valid if needed)
        IF NOT ST_IsValid(NEW.geom) THEN
            -- Attempt to make geometry valid
            NEW.geom := ST_MakeValid(NEW.geom);
            
            -- If still invalid after make valid, raise error
            IF NOT ST_IsValid(NEW.geom) THEN
                RAISE EXCEPTION 'Geometry could not be made valid: %', ST_IsValidReason(NEW.geom);
            END IF;
        END IF;
        
        -- Normalize geometry (remove duplicate points, etc.)
        NEW.geom := ST_Simplify(NEW.geom, 0.00001); -- Simplify with small tolerance to remove duplicate points
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to standardize geometry
DROP TRIGGER IF EXISTS standardize_property_geometry_trigger ON ver_properties;
CREATE TRIGGER standardize_property_geometry_trigger
    BEFORE INSERT OR UPDATE OF geom ON ver_properties
    FOR EACH ROW
    EXECUTE FUNCTION standardize_property_geometry();

-- ============================================================================
-- Enhance spatial indexing
-- ============================================================================

-- Drop existing spatial index if it exists (will recreate with better options)
DROP INDEX IF EXISTS idx_ver_properties_geom;

-- Create GIST spatial index with fillfactor for better performance
CREATE INDEX idx_ver_properties_geom 
ON ver_properties 
USING GIST(geom)
WITH (fillfactor = 90);

-- Create additional spatial indexes for common queries

-- Index for bounding box queries (using bounding box of geometry)
CREATE INDEX IF NOT EXISTS idx_ver_properties_geom_bbox 
ON ver_properties 
USING GIST(ST_Envelope(geom));

-- Index for area-based queries
CREATE INDEX IF NOT EXISTS idx_ver_properties_area 
ON ver_properties(area) 
WHERE area IS NOT NULL;

-- ============================================================================
-- Add constraints
-- ============================================================================

-- Add constraint for property_no (already exists as UNIQUE, but ensure it's not null)
ALTER TABLE ver_properties 
ALTER COLUMN property_no SET NOT NULL;

-- Add constraint for address (ensure it's not null)
ALTER TABLE ver_properties 
ALTER COLUMN address SET NOT NULL;

-- Add constraint for registration_date (must be valid date, can be null)
-- No constraint needed - DATE type already validates

-- Add constraint for area (must be positive if not null)
ALTER TABLE ver_properties 
ADD CONSTRAINT check_area_positive 
CHECK (area IS NULL OR area > 0);

-- Add constraint for metadata (must be valid JSONB)
-- JSONB type already validates, but we can add a check for object type
ALTER TABLE ver_properties 
ADD CONSTRAINT check_metadata_is_object 
CHECK (jsonb_typeof(metadata) = 'object');

-- ============================================================================
-- Add indexes for new columns
-- ============================================================================

-- Index for owner_name (for search)
CREATE INDEX IF NOT EXISTS idx_ver_properties_owner_name 
ON ver_properties(owner_name) 
WHERE owner_name IS NOT NULL;

-- Index for status (for filtering)
CREATE INDEX IF NOT EXISTS idx_ver_properties_status 
ON ver_properties(status);

-- Index for registration_date (for date range queries)
CREATE INDEX IF NOT EXISTS idx_ver_properties_registration_date 
ON ver_properties(registration_date) 
WHERE registration_date IS NOT NULL;

-- Index for metadata (GIN index for JSONB queries)
CREATE INDEX IF NOT EXISTS idx_ver_properties_metadata 
ON ver_properties 
USING GIN(metadata);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_ver_properties_status_registration 
ON ver_properties(status, registration_date DESC) 
WHERE registration_date IS NOT NULL;

-- ============================================================================
-- Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN ver_properties.owner_name IS 'Name of the property owner';
COMMENT ON COLUMN ver_properties.area IS 'Property area in square meters (computed from geometry)';
COMMENT ON COLUMN ver_properties.registration_date IS 'Date when the property was registered';
COMMENT ON COLUMN ver_properties.status IS 'Property status: active, inactive, pending, or archived';
COMMENT ON COLUMN ver_properties.metadata IS 'Additional property metadata as JSONB (flexible schema)';
COMMENT ON COLUMN ver_properties.geom IS 'PostGIS geometry column (POLYGON or MULTIPOLYGON, EPSG:4326 = WGS84)';

COMMENT ON FUNCTION compute_property_area() IS 'Automatically computes property area from geometry in square meters';
COMMENT ON FUNCTION validate_property_geometry() IS 'Validates geometry SRID, type, validity, and bounds';
COMMENT ON FUNCTION standardize_property_geometry() IS 'Standardizes geometry to EPSG:4326 and ensures validity';

COMMENT ON INDEX idx_ver_properties_geom IS 'GIST spatial index for efficient spatial queries';
COMMENT ON INDEX idx_ver_properties_geom_bbox IS 'GIST index on geometry bounding box for faster bounding box queries';
COMMENT ON INDEX idx_ver_properties_area IS 'Index on computed area for area-based queries';

-- ============================================================================
-- Grant permissions (if needed)
-- ============================================================================

-- Ensure authenticated users can read properties (RLS policies handle access control)
-- RLS policies are already set up in previous migrations
