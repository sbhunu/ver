-- Fix validate_property_geometry: replace bbox variable with ST_XMin/ST_XMax/ST_YMin/ST_YMax
-- Fixes: ERROR 42P01: missing FROM-clause entry for table "bbox"

CREATE OR REPLACE FUNCTION validate_property_geometry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.geom IS NOT NULL THEN
        IF ST_SRID(NEW.geom) != 4326 THEN
            RAISE EXCEPTION 'Geometry SRID must be 4326 (WGS84). Found: %', ST_SRID(NEW.geom);
        END IF;
        
        IF NOT (ST_GeometryType(NEW.geom) IN ('ST_Polygon', 'ST_MultiPolygon')) THEN
            RAISE EXCEPTION 'Geometry type must be POLYGON or MULTIPOLYGON. Found: %', ST_GeometryType(NEW.geom);
        END IF;
        
        IF NOT ST_IsValid(NEW.geom) THEN
            RAISE EXCEPTION 'Geometry is not valid: %', ST_IsValidReason(NEW.geom);
        END IF;
        
        IF ST_IsEmpty(NEW.geom) THEN
            RAISE EXCEPTION 'Geometry cannot be empty';
        END IF;
        
        -- Check bounding box within world bounds using PostGIS functions directly
        IF ST_XMin(NEW.geom) < -180 OR ST_XMax(NEW.geom) > 180 
           OR ST_YMin(NEW.geom) < -90 OR ST_YMax(NEW.geom) > 90 THEN
            RAISE EXCEPTION 'Geometry bounding box is outside valid world coordinates';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
