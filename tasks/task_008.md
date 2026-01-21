# Task ID: 8

**Title:** Properties and GIS Integration

**Status:** pending

**Dependencies:** 1, 6

**Priority:** medium

**Description:** Implement property registry with PostGIS spatial data and GeoJSON API for mapping functionality

**Details:**

Create property management CRUD operations with PostGIS geometry support. Implement supabase/functions/gis-layers Edge Function to serve GeoJSON FeatureCollections. Support filtering by document status, date ranges, and spatial bounds. Create property search with spatial queries (ST_Contains, ST_Intersects). Implement geometry validation and coordinate system standardization (EPSG:4326). Add spatial indexing for performance. Create property import functionality for bulk data loading. Support common geometry formats (WKT, GeoJSON).

**Test Strategy:**

Test PostGIS spatial queries and indexing performance. Validate GeoJSON output format compliance. Test spatial filtering with various geometry types. Verify coordinate system transformations. Load test with large property datasets.

## Subtasks

### 8.1. Create PostGIS Property Database Schema

**Status:** pending  
**Dependencies:** None  

Design and implement the property registry database schema with PostGIS spatial data support

**Details:**

Create ver_properties table with PostGIS geometry columns for property boundaries. Include fields for property_id, owner_name, address, geometry (POLYGON/MULTIPOLYGON), area, registration_date, status, and metadata JSONB. Set up spatial indexing using GIST indexes on geometry columns. Configure EPSG:4326 coordinate system as default. Add constraints for geometry validation and ensure all spatial data uses consistent coordinate reference system.

### 8.2. Implement Property CRUD Operations with Spatial Support

**Status:** pending  
**Dependencies:** 8.1  

Build comprehensive property management API with PostGIS spatial query capabilities

**Details:**

Create Next.js API routes for property CRUD operations using Supabase client. Implement spatial queries using PostGIS functions (ST_Contains, ST_Intersects, ST_Within). Add property search with spatial filtering by bounding box, point-in-polygon, and distance queries. Include geometry validation on create/update operations. Support WKT and GeoJSON input formats for geometry data. Add pagination and sorting for property listings.

### 8.3. Build GIS Layers Edge Function for GeoJSON API

**Status:** pending  
**Dependencies:** 8.1, 8.2  

Create Supabase Edge Function to serve property data as GeoJSON FeatureCollections for mapping

**Details:**

Implement supabase/functions/gis-layers Edge Function using Deno runtime. Convert PostGIS geometry data to GeoJSON format using ST_AsGeoJSON function. Support filtering by document status, date ranges, and spatial bounds via query parameters. Implement proper HTTP caching headers and CORS configuration. Add error handling for invalid spatial queries and malformed requests. Optimize queries with spatial indexing for performance.

### 8.4. Implement Property Bulk Import System

**Status:** pending  
**Dependencies:** 8.1, 8.2  

Create bulk property data import functionality supporting multiple geometry formats

**Details:**

Build property import API endpoint accepting CSV/JSON files with geometry data. Support multiple input formats: WKT, GeoJSON, and coordinate pairs. Implement data validation and geometry standardization to EPSG:4326. Add batch processing with transaction rollback on errors. Create import progress tracking and error reporting. Include duplicate detection based on geometry overlap or property identifiers. Add import history logging in ver_logs table.

### 8.5. Integrate GIS Mapping with Next.js Frontend

**Status:** pending  
**Dependencies:** 8.2, 8.3  

Build interactive property mapping interface using Leaflet and GeoJSON data from Edge Function

**Details:**

Implement Next.js pages with Leaflet map integration using react-leaflet library. Connect to gis-layers Edge Function for dynamic property layer loading. Add map controls for filtering by document status, date ranges, and spatial selection tools. Implement property popup displays with basic information and links to detailed views. Add drawing tools for spatial queries and property boundary editing. Include map layer toggles and base map selection (OpenStreetMap, satellite). Ensure responsive design for mobile devices.
