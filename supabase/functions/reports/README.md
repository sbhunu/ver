# Reports Edge Function

Supabase Edge Function for generating reports (CSV/PDF) for audit logs, verification reports, and property listings with role-based access control.

## Features

- **JWT Token Validation**: Validates JWT tokens from Authorization header
- **Role-Based Access Control**: Enforces role-based permissions (staff, verifier, chief_registrar, admin)
- **Multiple Report Types**: Supports audit logs, verification reports, and property listings
- **Flexible Filtering**: Supports date ranges, action types, status filters, and more
- **Performance Monitoring**: Logs request duration and record counts
- **CORS Support**: Configured for Next.js frontend integration

## Report Types

### 1. Audit Logs (`audit-logs`)
- Returns audit log entries from `ver_logs` table
- Role-based filtering:
  - Staff/Verifier: Only their own logs
  - Chief Registrar/Admin: All logs
- Filters: `startDate`, `endDate`, `actionType`, `actorId`

### 2. Verification Reports (`verification-reports`)
- Returns verification records with related document and profile data
- Role-based filtering:
  - Verifier: Only their own verifications
  - Staff: Verifications of documents they uploaded
  - Chief Registrar/Admin: All verifications
- Filters: `startDate`, `endDate`, `status`, `verifierId`

### 3. Property Listings (`property-listings`)
- Returns property records from `ver_properties` table
- All roles can access (with potential future filtering)
- Filters: `status`, `propertyNumber`

## Usage

### Request Format

```
GET /functions/v1/reports?type=<report-type>&format=<format>&<filters>
```

### Parameters

- `type` (required): Report type (`audit-logs`, `verification-reports`, `property-listings`)
- `format` (optional): Output format (`json`, `csv`, `pdf`) - defaults to `json`
- Filters (optional):
  - `startDate`: ISO 8601 date string
  - `endDate`: ISO 8601 date string
  - `actionType`: Action type for audit logs
  - `actorId`: Actor ID for audit logs
  - `status`: Status filter for verifications/properties
  - `verifierId`: Verifier ID for verification reports
  - `propertyNumber`: Property number for property listings

### Headers

```
Authorization: Bearer <jwt-token>
```

### Example Requests

#### Get audit logs (JSON)
```bash
curl -X GET \
  'https://<project-ref>.supabase.co/functions/v1/reports?type=audit-logs&format=json&startDate=2024-01-01&endDate=2024-01-31' \
  -H 'Authorization: Bearer <jwt-token>'
```

#### Get verification reports (CSV)
```bash
curl -X GET \
  'https://<project-ref>.supabase.co/functions/v1/reports?type=verification-reports&format=csv&status=verified' \
  -H 'Authorization: Bearer <jwt-token>'
```

#### Get property listings (PDF)
```bash
curl -X GET \
  'https://<project-ref>.supabase.co/functions/v1/reports?type=property-listings&format=pdf&status=active' \
  -H 'Authorization: Bearer <jwt-token>'
```

## Response Format

### Success Response (JSON)

```json
{
  "success": true,
  "type": "audit-logs",
  "format": "json",
  "recordCount": 150,
  "data": [...],
  "generatedAt": "2024-01-15T10:30:00Z",
  "generatedBy": "user@example.com"
}
```

### Error Response

```json
{
  "error": "Error message",
  "message": "Additional error details"
}
```

## Role-Based Access Control

| Role | Audit Logs | Verification Reports | Property Listings |
|------|------------|---------------------|-------------------|
| Staff | Own logs only | Own document verifications | All properties |
| Verifier | Own logs only | Own verifications | All properties |
| Chief Registrar | All logs | All verifications | All properties |
| Admin | All logs | All verifications | All properties |

## Performance

- Maximum 10,000 records per request
- Performance metrics logged for monitoring
- Efficient database queries with proper indexing

## Error Handling

- 401: Unauthorized (invalid or missing JWT token)
- 403: Forbidden (insufficient permissions)
- 400: Bad Request (invalid parameters)
- 405: Method Not Allowed
- 500: Internal Server Error

## Environment Variables

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key

## PDF Export

PDF reports are generated as HTML that can be:
1. **Printed to PDF** using browser print functionality (Ctrl+P / Cmd+P)
2. **Converted client-side** using jsPDF or similar library
3. **Converted server-side** using a PDF service (e.g., Puppeteer, Playwright)

The HTML includes:
- Professional styling with company branding
- Headers and footers with page numbering
- Executive summary statistics
- Analytics charts and tables
- Multi-page support with proper pagination
- Print-optimized CSS

### PDF Templates

**Executive Summary:**
- Summary statistics (verification rates, counts)
- Top rejection reasons
- Documents by status
- Key metrics visualization

**Compliance Reports:**
- Complete audit trail
- Verification records
- Detailed statistics
- Date range filtering

**Verification Statistics:**
- Verification rates
- Rejection analysis
- Trends over time
- Geographic data (if available)

## Future Enhancements

- Server-side PDF conversion service integration
- Report scheduling
- Email delivery
- Report caching
- Enhanced streaming for large datasets
- Chart.js integration for visual charts
