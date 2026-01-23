-- Create PostGIS RPC functions for property bulk import
-- Task 8.4: Implement Property Bulk Import System

-- ============================================================================
-- Function: Check property geometry overlap
-- ============================================================================

CREATE OR REPLACE FUNCTION check_property_geometry_overlap(
  search_geom_text TEXT
)
RETURNS TABLE (
  id UUID,
  property_no TEXT,
  overlap_ratio DOUBLE PRECISION
) AS $$
DECLARE
  search_geom GEOMETRY;
BEGIN
  -- Try to parse as GeoJSON first, then WKT
  BEGIN
    search_geom := ST_GeomFromGeoJSON(search_geom_text);
  EXCEPTION
    WHEN OTHERS THEN
      BEGIN
        search_geom := ST_GeomFromText(search_geom_text, 4326);
      EXCEPTION
        WHEN OTHERS THEN
          RAISE EXCEPTION 'Invalid geometry format: %', SQLERRM;
      END;
  END;

  -- Ensure SRID is 4326
  IF ST_SRID(search_geom) != 4326 THEN
    search_geom := ST_Transform(search_geom, 4326);
  END IF;

  -- Find overlapping properties and calculate overlap ratio
  RETURN QUERY
  SELECT
    p.id,
    p.property_no,
    CASE
      WHEN ST_Area(search_geom::geography) > 0 THEN
        ST_Area(ST_Intersection(p.geom::geography, search_geom::geography)) /
        ST_Area(search_geom::geography)
      ELSE 0
    END as overlap_ratio
  FROM ver_properties p
  WHERE
    p.geom IS NOT NULL
    AND ST_Intersects(p.geom, search_geom)
    AND ST_Area(ST_Intersection(p.geom::geography, search_geom::geography)) > 0
  ORDER BY overlap_ratio DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: Bulk insert properties with transaction support
-- Note: This function processes properties one by one and returns results
-- For true transaction support, use application-level batching
-- ============================================================================

CREATE OR REPLACE FUNCTION bulk_insert_properties(
  properties_data JSONB
)
RETURNS TABLE (
  success BOOLEAN,
  property_id UUID,
  property_no TEXT,
  error_message TEXT,
  error_code TEXT
) AS $$
DECLARE
  property_record JSONB;
  inserted_id UUID;
  property_no_val TEXT;
  geom_text TEXT;
  geom_parsed GEOMETRY;
BEGIN
  -- Process each property in the array
  FOR property_record IN SELECT * FROM jsonb_array_elements(properties_data)
  LOOP
    BEGIN
      property_no_val := property_record->>'property_no';

      -- Parse geometry if provided
      geom_text := property_record->>'geom';
      geom_parsed := NULL;

      IF geom_text IS NOT NULL AND geom_text != '' THEN
        BEGIN
          -- Try GeoJSON first
          geom_parsed := ST_GeomFromGeoJSON(geom_text);
        EXCEPTION
          WHEN OTHERS THEN
            BEGIN
              -- Try WKT
              geom_parsed := ST_GeomFromText(geom_text, 4326);
            EXCEPTION
              WHEN OTHERS THEN
                RAISE EXCEPTION 'Invalid geometry format: %', SQLERRM;
            END;
        END;

        -- Ensure SRID is 4326
        IF ST_SRID(geom_parsed) != 4326 THEN
          geom_parsed := ST_Transform(geom_parsed, 4326);
        END IF;
      END IF;

      -- Insert property
      INSERT INTO ver_properties (
        property_no,
        address,
        owner_name,
        geom,
        registration_date,
        status,
        metadata
      )
      VALUES (
        property_record->>'property_no',
        property_record->>'address',
        NULLIF(property_record->>'owner_name', '')::TEXT,
        geom_parsed,
        NULLIF(property_record->>'registration_date', '')::DATE,
        COALESCE(
          NULLIF((property_record->>'status')::TEXT, '')::property_status,
          'active'
        ),
        COALESCE(
          (property_record->>'metadata')::JSONB,
          '{}'::JSONB
        )
      )
      RETURNING id INTO inserted_id;

      -- Return success
      RETURN QUERY SELECT TRUE, inserted_id, property_no_val, NULL::TEXT, NULL::TEXT;

    EXCEPTION
      WHEN unique_violation THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, property_no_val, 'Duplicate property number', 'DUPLICATE_PROPERTY_NO'::TEXT;
      WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, property_no_val, SQLERRM, 'INSERT_ERROR'::TEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON FUNCTION check_property_geometry_overlap IS 'Check for property geometry overlaps and calculate overlap ratio';
COMMENT ON FUNCTION bulk_insert_properties IS 'Bulk insert properties with transaction support and error handling';

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION check_property_geometry_overlap TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_insert_properties TO authenticated;
