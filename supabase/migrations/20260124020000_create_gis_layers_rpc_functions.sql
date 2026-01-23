-- Create PostGIS RPC functions for GIS Layers Edge Function
-- Task 8.3: Build GIS Layers Edge Function for GeoJSON API

-- ============================================================================
-- Function: Get properties as GeoJSON with filtering
-- ============================================================================

CREATE OR REPLACE FUNCTION get_properties_geojson(
  document_status_filter TEXT DEFAULT NULL,
  start_date_filter DATE DEFAULT NULL,
  end_date_filter DATE DEFAULT NULL,
  bbox_min_lng DOUBLE PRECISION DEFAULT NULL,
  bbox_min_lat DOUBLE PRECISION DEFAULT NULL,
  bbox_max_lng DOUBLE PRECISION DEFAULT NULL,
  bbox_max_lat DOUBLE PRECISION DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  property_no TEXT,
  address TEXT,
  owner_name TEXT,
  area DOUBLE PRECISION,
  registration_date DATE,
  status property_status,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  geom JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id,
    p.property_no,
    p.address,
    p.owner_name,
    p.area,
    p.registration_date,
    p.status,
    p.metadata,
    p.created_at,
    p.updated_at,
    ST_AsGeoJSON(p.geom)::jsonb as geom
  FROM ver_properties p
  LEFT JOIN ver_documents d ON d.property_id = p.id
  WHERE
    p.geom IS NOT NULL
    AND (document_status_filter IS NULL OR d.status = document_status_filter::document_status)
    AND (start_date_filter IS NULL OR p.registration_date >= start_date_filter)
    AND (end_date_filter IS NULL OR p.registration_date <= end_date_filter)
    AND (
      bbox_min_lng IS NULL OR
      ST_Intersects(
        p.geom,
        ST_MakeEnvelope(bbox_min_lng, bbox_min_lat, bbox_max_lng, bbox_max_lat, 4326)
      )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON FUNCTION get_properties_geojson IS 'Get properties as GeoJSON with filtering by document status, date range, and spatial bounds';

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_properties_geojson TO authenticated;
GRANT EXECUTE ON FUNCTION get_properties_geojson TO anon;
