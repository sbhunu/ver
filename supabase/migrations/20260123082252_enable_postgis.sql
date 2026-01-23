-- Enable PostGIS extension for spatial data support
-- This extension provides geometry types and spatial functions for the ver_properties table

CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify PostGIS installation
-- You can test with: SELECT PostGIS_version();
