-- Create PostGIS RPC functions for property spatial queries
-- Task 8.2: Implement Property CRUD Operations with Spatial Support

-- ============================================================================
-- Function: Find properties containing a point
-- ============================================================================

CREATE OR REPLACE FUNCTION find_properties_containing_point(
  point_longitude DOUBLE PRECISION,
  point_latitude DOUBLE PRECISION
)
RETURNS TABLE (
  id UUID,
  property_no TEXT,
  address TEXT,
  owner_name TEXT,
  geom GEOMETRY,
  area DOUBLE PRECISION,
  registration_date DATE,
  status property_status,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.property_no,
    p.address,
    p.owner_name,
    p.geom,
    p.area,
    p.registration_date,
    p.status,
    p.metadata,
    p.created_at,
    p.updated_at
  FROM ver_properties p
  WHERE
    p.geom IS NOT NULL
    AND ST_Contains(p.geom, ST_SetSRID(ST_MakePoint(point_longitude, point_latitude), 4326));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: Find properties intersecting with a geometry
-- ============================================================================

CREATE OR REPLACE FUNCTION find_properties_intersecting(
  search_geom GEOMETRY
)
RETURNS TABLE (
  id UUID,
  property_no TEXT,
  address TEXT,
  owner_name TEXT,
  geom GEOMETRY,
  area DOUBLE PRECISION,
  registration_date DATE,
  status property_status,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Ensure search geometry is in EPSG:4326
  IF ST_SRID(search_geom) != 4326 THEN
    search_geom := ST_Transform(search_geom, 4326);
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.property_no,
    p.address,
    p.owner_name,
    p.geom,
    p.area,
    p.registration_date,
    p.status,
    p.metadata,
    p.created_at,
    p.updated_at
  FROM ver_properties p
  WHERE
    p.geom IS NOT NULL
    AND ST_Intersects(p.geom, search_geom);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: Find properties within a geometry (ST_Within)
-- ============================================================================

CREATE OR REPLACE FUNCTION find_properties_within(
  search_geom GEOMETRY
)
RETURNS TABLE (
  id UUID,
  property_no TEXT,
  address TEXT,
  owner_name TEXT,
  geom GEOMETRY,
  area DOUBLE PRECISION,
  registration_date DATE,
  status property_status,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Ensure search geometry is in EPSG:4326
  IF ST_SRID(search_geom) != 4326 THEN
    search_geom := ST_Transform(search_geom, 4326);
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.property_no,
    p.address,
    p.owner_name,
    p.geom,
    p.area,
    p.registration_date,
    p.status,
    p.metadata,
    p.created_at,
    p.updated_at
  FROM ver_properties p
  WHERE
    p.geom IS NOT NULL
    AND ST_Within(p.geom, search_geom);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: Find properties in bounding box
-- ============================================================================

CREATE OR REPLACE FUNCTION find_properties_in_bbox(
  min_lng DOUBLE PRECISION,
  min_lat DOUBLE PRECISION,
  max_lng DOUBLE PRECISION,
  max_lat DOUBLE PRECISION
)
RETURNS TABLE (
  id UUID,
  property_no TEXT,
  address TEXT,
  owner_name TEXT,
  geom GEOMETRY,
  area DOUBLE PRECISION,
  registration_date DATE,
  status property_status,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  bbox_geom GEOMETRY;
BEGIN
  -- Create bounding box polygon
  bbox_geom := ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326);

  RETURN QUERY
  SELECT
    p.id,
    p.property_no,
    p.address,
    p.owner_name,
    p.geom,
    p.area,
    p.registration_date,
    p.status,
    p.metadata,
    p.created_at,
    p.updated_at
  FROM ver_properties p
  WHERE
    p.geom IS NOT NULL
    AND ST_Intersects(p.geom, bbox_geom);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: Find properties within distance of a point
-- ============================================================================

CREATE OR REPLACE FUNCTION find_properties_within_distance(
  point_longitude DOUBLE PRECISION,
  point_latitude DOUBLE PRECISION,
  max_distance_meters DOUBLE PRECISION
)
RETURNS TABLE (
  id UUID,
  property_no TEXT,
  address TEXT,
  owner_name TEXT,
  geom GEOMETRY,
  area DOUBLE PRECISION,
  registration_date DATE,
  status property_status,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  distance_meters DOUBLE PRECISION
) AS $$
DECLARE
  point_geom GEOMETRY;
BEGIN
  -- Create point geometry
  point_geom := ST_SetSRID(ST_MakePoint(point_longitude, point_latitude), 4326);

  RETURN QUERY
  SELECT
    p.id,
    p.property_no,
    p.address,
    p.owner_name,
    p.geom,
    p.area,
    p.registration_date,
    p.status,
    p.metadata,
    p.created_at,
    p.updated_at,
    ST_Distance(p.geom::geography, point_geom::geography) as distance_meters
  FROM ver_properties p
  WHERE
    p.geom IS NOT NULL
    AND ST_DWithin(p.geom::geography, point_geom::geography, max_distance_meters)
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: Convert WKT to PostGIS geometry
-- ============================================================================

CREATE OR REPLACE FUNCTION wkt_to_geometry(wkt_text TEXT, srid INTEGER DEFAULT 4326)
RETURNS GEOMETRY AS $$
BEGIN
  RETURN ST_GeomFromText(wkt_text, srid);
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid WKT format: %', SQLERRM;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Function: Convert GeoJSON to PostGIS geometry
-- ============================================================================

CREATE OR REPLACE FUNCTION geojson_to_geometry(geojson_text TEXT, srid INTEGER DEFAULT 4326)
RETURNS GEOMETRY AS $$
DECLARE
  result_geom GEOMETRY;
BEGIN
  result_geom := ST_GeomFromGeoJSON(geojson_text);
  
  -- Ensure correct SRID
  IF ST_SRID(result_geom) != srid THEN
    result_geom := ST_SetSRID(result_geom, srid);
  END IF;
  
  RETURN result_geom;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid GeoJSON format: %', SQLERRM;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON FUNCTION find_properties_containing_point IS 'Find properties that contain a given point (ST_Contains)';
COMMENT ON FUNCTION find_properties_intersecting IS 'Find properties that intersect with a given geometry (ST_Intersects)';
COMMENT ON FUNCTION find_properties_within IS 'Find properties that are within a given geometry (ST_Within)';
COMMENT ON FUNCTION find_properties_in_bbox IS 'Find properties within a bounding box';
COMMENT ON FUNCTION find_properties_within_distance IS 'Find properties within a distance of a point (ST_DWithin)';
COMMENT ON FUNCTION wkt_to_geometry IS 'Convert WKT (Well-Known Text) string to PostGIS geometry';
COMMENT ON FUNCTION geojson_to_geometry IS 'Convert GeoJSON string to PostGIS geometry';

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION find_properties_containing_point TO authenticated;
GRANT EXECUTE ON FUNCTION find_properties_intersecting TO authenticated;
GRANT EXECUTE ON FUNCTION find_properties_within TO authenticated;
GRANT EXECUTE ON FUNCTION find_properties_in_bbox TO authenticated;
GRANT EXECUTE ON FUNCTION find_properties_within_distance TO authenticated;
GRANT EXECUTE ON FUNCTION wkt_to_geometry TO authenticated;
GRANT EXECUTE ON FUNCTION geojson_to_geometry TO authenticated;
