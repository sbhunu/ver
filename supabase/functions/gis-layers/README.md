# GIS Layers Edge Function

Supabase Edge Function to serve property data as GeoJSON FeatureCollections for mapping functionality.

## Features

- Converts PostGIS geometry data to GeoJSON format using ST_AsGeoJSON
- Supports filtering by:
  - Document status (pending, hashed, verified, rejected, flagged)
  - Date ranges (registration_date)
  - Spatial bounds (bounding box)
- Implements HTTP caching headers (5 minutes default)
- CORS configuration for cross-origin requests
- Error handling for invalid spatial queries and malformed requests
- Optimized queries with spatial indexing

## Usage

### Basic Request

```
GET /functions/v1/gis-layers
```

### Query Parameters

- `bbox_min_lng` (optional): Minimum longitude for bounding box filter
- `bbox_min_lat` (optional): Minimum latitude for bounding box filter
- `bbox_max_lng` (optional): Maximum longitude for bounding box filter
- `bbox_max_lat` (optional): Maximum latitude for bounding box filter
- `document_status` (optional): Filter by document status (pending, hashed, verified, rejected, flagged)
- `start_date` (optional): Start date for date range filter (YYYY-MM-DD)
- `end_date` (optional): End date for date range filter (YYYY-MM-DD)
- `no_cache` (optional): Set to 'true' to disable caching

### Examples

**Get all properties:**
```
GET /functions/v1/gis-layers
```

**Get properties in bounding box:**
```
GET /functions/v1/gis-layers?bbox_min_lng=-123&bbox_min_lat=37&bbox_max_lng=-122&bbox_max_lat=38
```

**Get properties with verified documents:**
```
GET /functions/v1/gis-layers?document_status=verified
```

**Get properties registered in date range:**
```
GET /functions/v1/gis-layers?start_date=2024-01-01&end_date=2024-12-31
```

**Combined filters:**
```
GET /functions/v1/gis-layers?bbox_min_lng=-123&bbox_min_lat=37&bbox_max_lng=-122&bbox_max_lat=38&document_status=verified&start_date=2024-01-01
```

## Response Format

Returns a GeoJSON FeatureCollection:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[...]]
      },
      "properties": {
        "id": "uuid",
        "property_no": "PROP-001",
        "address": "123 Main St",
        "owner_name": "John Doe",
        "area": 1234.56,
        "registration_date": "2024-01-01",
        "status": "active",
        "metadata": {},
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    }
  ]
}
```

## Error Responses

- `400 Bad Request`: Invalid query parameters
- `405 Method Not Allowed`: Wrong HTTP method
- `500 Internal Server Error`: Server error

## Caching

Responses are cached for 5 minutes by default. Set `no_cache=true` to disable caching.

## CORS

CORS is enabled for all origins. Use appropriate authentication headers for protected endpoints.
