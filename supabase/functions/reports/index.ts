/**
 * Reports Edge Function
 * 
 * Supabase Edge Function to generate reports (CSV/PDF) for audit logs,
 * verification reports, and property listings with role-based access control.
 * 
 * Uses Deno runtime with JWT validation and role-based access control.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// Report types
type ReportType = 'audit-logs' | 'verification-reports' | 'property-listings'

// User roles
type UserRole = 'staff' | 'verifier' | 'chief_registrar' | 'admin'

// Initialize Supabase client with service role key for database operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * CORS headers for cross-origin requests
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

/**
 * Create error response with CORS headers
 */
function createErrorResponse(
  status: number,
  message: string,
  details?: Record<string, unknown>
): Response {
  return new Response(
    JSON.stringify({
      error: message,
      ...details,
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  )
}

/**
 * Create success response with CORS headers
 */
function createSuccessResponse(data: unknown, contentType: string = 'application/json'): Response {
  return new Response(typeof data === 'string' ? data : JSON.stringify(data), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': contentType,
    },
  })
}

/**
 * Validate JWT token and extract user information
 */
async function validateJWT(authHeader: string | null): Promise<{
  userId: string
  email: string
  role: UserRole
} | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)

  try {
    // Verify JWT token using Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      console.error('JWT validation error:', error)
      return null
    }

    // Get user profile with role
    const { data: profile, error: profileError } = await supabase
      .from('ver_profiles')
      .select('id, email, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError)
      return null
    }

    return {
      userId: profile.id,
      email: profile.email,
      role: profile.role as UserRole,
    }
  } catch (error) {
    console.error('JWT validation exception:', error)
    return null
  }
}

/**
 * Check if user has required role
 */
function hasRequiredRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  // Role hierarchy: staff < verifier < chief_registrar < admin
  const roleHierarchy: Record<UserRole, number> = {
    staff: 1,
    verifier: 2,
    chief_registrar: 3,
    admin: 4,
  }

  const userLevel = roleHierarchy[userRole] || 0
  const requiredLevel = Math.max(...requiredRoles.map((r) => roleHierarchy[r] || 0))

  return userLevel >= requiredLevel
}

/**
 * Get audit logs report data with pagination
 */
async function getAuditLogsReport(
  userId: string,
  userRole: UserRole,
  filters: {
    startDate?: string
    endDate?: string
    actionType?: string
    actorId?: string
    page?: number
    pageSize?: number
  }
): Promise<{ data: unknown[]; total: number; page: number; pageSize: number; totalPages: number }> {
  let query = supabase.from('ver_logs').select('*', { count: 'exact' })

  // Apply role-based filtering
  if (userRole === 'staff' || userRole === 'verifier') {
    // Staff and verifiers can only see their own logs
    query = query.eq('actor_id', userId)
  } else if (userRole === 'chief_registrar') {
    // Chief registrar can see all logs
    // No additional filter needed
  } else if (userRole === 'admin') {
    // Admin can see all logs
    // No additional filter needed
  }

  // Apply date filters
  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate)
  }
  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate)
  }

  // Apply action type filter
  if (filters.actionType) {
    query = query.eq('action', filters.actionType)
  }

  // Apply actor filter (only for chief_registrar and admin)
  if (filters.actorId && (userRole === 'chief_registrar' || userRole === 'admin')) {
    query = query.eq('actor_id', filters.actorId)
  }

  // Pagination
  const page = filters.page || 1
  const pageSize = filters.pageSize || 1000
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    throw new Error(`Failed to fetch audit logs: ${error.message}`)
  }

  const total = count || 0
  const totalPages = Math.ceil(total / pageSize)

  return {
    data: data || [],
    total,
    page,
    pageSize,
    totalPages,
  }
}

/**
 * Get verification reports data with pagination
 */
async function getVerificationReports(
  userId: string,
  userRole: UserRole,
  filters: {
    startDate?: string
    endDate?: string
    status?: string
    verifierId?: string
    page?: number
    pageSize?: number
  }
): Promise<{ data: unknown[]; total: number; page: number; pageSize: number; totalPages: number }> {
  let query = supabase
    .from('ver_verifications')
    .select('*, ver_documents(*), ver_profiles!ver_verifications_verifier_id_fkey(*)', { count: 'exact' })

  // Apply role-based filtering
  if (userRole === 'verifier') {
    // Verifiers can only see their own verifications
    query = query.eq('verifier_id', userId)
  } else if (userRole === 'staff') {
    // Staff can see verifications of documents they uploaded
    const { data: staffDocs } = await supabase
      .from('ver_documents')
      .select('id')
      .eq('uploader_id', userId)

    const docIds = staffDocs?.map((d) => d.id) || []
    if (docIds.length > 0) {
      query = query.in('document_id', docIds)
    } else {
      // No documents uploaded, return empty
      return {
        data: [],
        total: 0,
        page: filters.page || 1,
        pageSize: filters.pageSize || 1000,
        totalPages: 0,
      }
    }
  }

  // Apply date filters
  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate)
  }
  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate)
  }

  // Apply status filter
  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  // Apply verifier filter (only for chief_registrar and admin)
  if (filters.verifierId && (userRole === 'chief_registrar' || userRole === 'admin')) {
    query = query.eq('verifier_id', filters.verifierId)
  }

  // Pagination
  const page = filters.page || 1
  const pageSize = filters.pageSize || 1000
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    throw new Error(`Failed to fetch verification reports: ${error.message}`)
  }

  const total = count || 0
  const totalPages = Math.ceil(total / pageSize)

  return {
    data: data || [],
    total,
    page,
    pageSize,
    totalPages,
  }
}

/**
 * Get property listings data with pagination
 */
async function getPropertyListings(
  userId: string,
  userRole: UserRole,
  filters: {
    status?: string
    propertyNumber?: string
    page?: number
    pageSize?: number
  }
): Promise<{ data: unknown[]; total: number; page: number; pageSize: number; totalPages: number }> {
  let query = supabase.from('ver_properties').select('*', { count: 'exact' })

  // All roles can see properties, but we could add filtering here if needed

  // Apply status filter
  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  // Apply property number filter (schema uses property_no)
  if (filters.propertyNumber) {
    query = query.eq('property_no', filters.propertyNumber)
  }

  // Pagination
  const page = filters.page || 1
  const pageSize = filters.pageSize || 1000
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    throw new Error(`Failed to fetch property listings: ${error.message}`)
  }

  const total = count || 0
  const totalPages = Math.ceil(total / pageSize)

  return {
    data: data || [],
    total,
    page,
    pageSize,
    totalPages,
  }
}

/**
 * Get analytics data for PDF reports
 */
async function getAnalyticsData(
  userId: string,
  userRole: UserRole,
  filters: {
    startDate?: string
    endDate?: string
  }
): Promise<{
  verificationRate: number
  totalVerifications: number
  verifiedCount: number
  rejectedCount: number
  rejectionReasons: Array<{ reason: string; count: number; percentage: number }>
  documentsByStatus: Record<string, number>
  verificationsOverTime: Array<{ date: string; count: number }>
}> {
  const startDate = filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const endDate = filters.endDate || new Date().toISOString()

  // Get verification statistics
  const { data: verifications } = await supabase
    .from('ver_verifications')
    .select('status, reason, created_at')
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const totalVerifications = verifications?.length || 0
  const verifiedCount = verifications?.filter((v) => v.status === 'verified').length || 0
  const rejectedCount = verifications?.filter((v) => v.status === 'rejected').length || 0
  const verificationRate = totalVerifications > 0 ? (verifiedCount / totalVerifications) * 100 : 0

  // Get rejection reasons
  const rejectionReasonsMap: Record<string, number> = {}
  verifications?.forEach((v) => {
    if (v.status === 'rejected' && v.reason) {
      rejectionReasonsMap[v.reason] = (rejectionReasonsMap[v.reason] || 0) + 1
    }
  })

  const rejectionReasons = Object.entries(rejectionReasonsMap)
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: rejectedCount > 0 ? (count / rejectedCount) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Get documents by status
  const { data: documents } = await supabase
    .from('ver_documents')
    .select('status')
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const documentsByStatus: Record<string, number> = {}
  documents?.forEach((doc) => {
    documentsByStatus[doc.status] = (documentsByStatus[doc.status] || 0) + 1
  })

  // Get verifications over time
  const verificationsByDate: Record<string, number> = {}
  verifications?.forEach((v) => {
    const date = new Date(v.created_at).toISOString().split('T')[0]
    verificationsByDate[date] = (verificationsByDate[date] || 0) + 1
  })

  const verificationsOverTime = Object.entries(verificationsByDate)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    verificationRate,
    totalVerifications,
    verifiedCount,
    rejectedCount,
    rejectionReasons,
    documentsByStatus,
    verificationsOverTime,
  }
}

/**
 * Generate HTML template for PDF reports
 */
function generatePDFHTML(
  reportType: ReportType,
  reportData: unknown[],
  analytics?: {
    verificationRate: number
    totalVerifications: number
    verifiedCount: number
    rejectedCount: number
    rejectionReasons: Array<{ reason: string; count: number; percentage: number }>
    documentsByStatus: Record<string, number>
    verificationsOverTime: Array<{ date: string; count: number }>
  },
  metadata?: {
    generatedBy: string
    generatedAt: string
    filters?: Record<string, string>
  }
): string {
  const title = reportType === 'audit-logs' 
    ? 'Audit Logs Report'
    : reportType === 'verification-reports'
    ? 'Verification Reports'
    : 'Property Listings Report'

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @page {
      margin: 2cm;
      @top-center {
        content: "${title}";
        font-size: 10pt;
        color: #666;
      }
      @bottom-center {
        content: "Page " counter(page) " of " counter(pages);
        font-size: 10pt;
        color: #666;
      }
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
      background: #fff;
    }
    .header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #2563eb;
      font-size: 24pt;
      margin-bottom: 10px;
    }
    .header .metadata {
      color: #666;
      font-size: 9pt;
    }
    .summary {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .summary h2 {
      color: #1e293b;
      font-size: 16pt;
      margin-bottom: 15px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
    }
    .summary-item {
      background: #fff;
      padding: 15px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .summary-item .label {
      font-size: 9pt;
      color: #64748b;
      margin-bottom: 5px;
    }
    .summary-item .value {
      font-size: 20pt;
      font-weight: bold;
      color: #1e293b;
    }
    .analytics {
      margin-bottom: 30px;
    }
    .analytics h2 {
      color: #1e293b;
      font-size: 16pt;
      margin-bottom: 15px;
    }
    .chart-placeholder {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      padding: 40px;
      text-align: center;
      color: #64748b;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      font-size: 9pt;
    }
    table thead {
      background: #1e293b;
      color: #fff;
    }
    table th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #334155;
    }
    table td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    table tbody tr:hover {
      background: #f8fafc;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 9pt;
      color: #64748b;
      text-align: center;
    }
    .page-break {
      page-break-before: always;
    }
    @media print {
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <div class="metadata">
      ${metadata ? `
        <p>Generated by: ${metadata.generatedBy}</p>
        <p>Generated at: ${new Date(metadata.generatedAt).toLocaleString()}</p>
        ${metadata.filters && Object.keys(metadata.filters).length > 0 ? `
          <p>Filters: ${Object.entries(metadata.filters).map(([k, v]) => `${k}=${v}`).join(', ')}</p>
        ` : ''}
      ` : ''}
    </div>
  </div>

  ${analytics ? `
    <div class="summary">
      <h2>Summary Statistics</h2>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="label">Total Verifications</div>
          <div class="value">${analytics.totalVerifications}</div>
        </div>
        <div class="summary-item">
          <div class="label">Verified</div>
          <div class="value">${analytics.verifiedCount}</div>
        </div>
        <div class="summary-item">
          <div class="label">Rejected</div>
          <div class="value">${analytics.rejectedCount}</div>
        </div>
        <div class="summary-item">
          <div class="label">Verification Rate</div>
          <div class="value">${analytics.verificationRate.toFixed(1)}%</div>
        </div>
      </div>
    </div>

    ${analytics.rejectionReasons.length > 0 ? `
      <div class="analytics">
        <h2>Top Rejection Reasons</h2>
        <table>
          <thead>
            <tr>
              <th>Reason</th>
              <th>Count</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${analytics.rejectionReasons.map((r) => `
              <tr>
                <td>${r.reason}</td>
                <td>${r.count}</td>
                <td>${r.percentage.toFixed(1)}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}

    ${Object.keys(analytics.documentsByStatus).length > 0 ? `
      <div class="analytics">
        <h2>Documents by Status</h2>
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(analytics.documentsByStatus).map(([status, count]) => `
              <tr>
                <td>${status}</td>
                <td>${count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}
  ` : ''}

  <div class="analytics">
    <h2>Report Data</h2>
    <p>Total Records: ${reportData.length}</p>
    ${reportData.length > 0 ? `
      <table>
        <thead>
          <tr>
            ${Object.keys(reportData[0] as Record<string, unknown>).slice(0, 10).map((key) => `
              <th>${key}</th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${reportData.slice(0, 100).map((row) => {
            const record = row as Record<string, unknown>
            return `
              <tr>
                ${Object.keys(record).slice(0, 10).map((key) => `
                  <td>${typeof record[key] === 'object' ? JSON.stringify(record[key]) : String(record[key] || '')}</td>
                `).join('')}
              </tr>
            `
          }).join('')}
        </tbody>
      </table>
      ${reportData.length > 100 ? `<p><em>Showing first 100 of ${reportData.length} records</em></p>` : ''}
    ` : '<p>No data available</p>'}
  </div>

  <div class="footer">
    <p>This report was generated automatically by the VER System</p>
    <p>Confidential - For internal use only</p>
  </div>
</body>
</html>
  `

  return html
}

/**
 * Sanitize value to prevent CSV injection attacks
 * Removes or escapes dangerous characters that could be interpreted as formulas
 */
function sanitizeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  const str = String(value)

  // Check for CSV injection patterns (formulas starting with =, +, -, @, \t, \r)
  const dangerousPatterns = /^[=+\-@\t\r]/
  if (dangerousPatterns.test(str)) {
    // Escape by prefixing with single quote (Excel-safe)
    return `'${str}`
  }

  return str
}

/**
 * Escape CSV field value
 * Handles quotes, newlines, and special characters
 */
function escapeCSVField(value: string): string {
  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Convert value to CSV-safe string
 */
function toCSVValue(value: unknown): string {
  const sanitized = sanitizeCSVValue(value)
  return escapeCSVField(sanitized)
}

/**
 * Generate CSV row from object
 */
function generateCSVRow(columns: string[], data: Record<string, unknown>): string {
  return columns.map((col) => toCSVValue(data[col])).join(',')
}

/**
 * Generate CSV header row
 */
function generateCSVHeader(columns: string[]): string {
  return columns.map((col) => escapeCSVField(col)).join(',')
}

/**
 * Format audit logs for CSV export
 */
function formatAuditLogsForCSV(data: unknown[]): { columns: string[]; rows: string[] } {
  const columns = [
    'id',
    'actor_id',
    'action',
    'target_type',
    'target_id',
    'ip_address',
    'user_agent',
    'details',
    'created_at',
  ]

  const rows = data.map((item) => {
    const record = item as Record<string, unknown>
    // Format details as JSON string
    const formattedRecord = {
      ...record,
      details: typeof record.details === 'object' ? JSON.stringify(record.details) : record.details,
    }
    return generateCSVRow(columns, formattedRecord)
  })

  return { columns, rows }
}

/**
 * Format verification reports for CSV export
 */
function formatVerificationReportsForCSV(data: unknown[]): { columns: string[]; rows: string[] } {
  const columns = [
    'id',
    'document_id',
    'verifier_id',
    'status',
    'reason',
    'discrepancy_metadata',
    'created_at',
    'updated_at',
  ]

  const rows = data.map((item) => {
    const record = item as Record<string, unknown>
    // Format discrepancy_metadata as JSON string if it's an object
    const formattedRecord = {
      ...record,
      discrepancy_metadata:
        typeof record.discrepancy_metadata === 'object'
          ? JSON.stringify(record.discrepancy_metadata)
          : record.discrepancy_metadata,
    }
    return generateCSVRow(columns, formattedRecord)
  })

  return { columns, rows }
}

/**
 * Format property listings for CSV export
 */
function formatPropertyListingsForCSV(data: unknown[]): { columns: string[]; rows: string[] } {
  const columns = [
    'id',
    'property_no',
    'address',
    'owner_name',
    'area',
    'registration_date',
    'status',
    'metadata',
    'created_at',
    'updated_at',
  ]

  const rows = data.map((item) => {
    const record = item as Record<string, unknown>
    // Format metadata as JSON string if it's an object
    // Note: geom is excluded as it's complex geometry data
    const formattedRecord = {
      ...record,
      metadata:
        typeof record.metadata === 'object' ? JSON.stringify(record.metadata) : record.metadata,
    }
    return generateCSVRow(columns, formattedRecord)
  })

  return { columns, rows }
}

/**
 * Generate CSV content with streaming support for large datasets
 */
function generateCSV(
  reportType: ReportType,
  data: unknown[],
  customColumns?: string[]
): string {
  let formatted: { columns: string[]; rows: string[] }

  // Format data based on report type
  switch (reportType) {
    case 'audit-logs':
      formatted = formatAuditLogsForCSV(data)
      break
    case 'verification-reports':
      formatted = formatVerificationReportsForCSV(data)
      break
    case 'property-listings':
      formatted = formatPropertyListingsForCSV(data)
      break
    default:
      throw new Error(`Unsupported report type for CSV: ${reportType}`)
  }

  // Use custom columns if provided, otherwise use default
  const columns = customColumns && customColumns.length > 0 ? customColumns : formatted.columns

  // Validate that all custom columns exist
  if (customColumns) {
    const invalidColumns = customColumns.filter((col) => !formatted.columns.includes(col))
    if (invalidColumns.length > 0) {
      throw new Error(`Invalid columns: ${invalidColumns.join(', ')}`)
    }
  }

  // Build CSV content
  const lines: string[] = []

  // Add BOM for UTF-8 (helps Excel recognize UTF-8 encoding)
  lines.push('\uFEFF')

  // Add header
  lines.push(generateCSVHeader(columns))

  // Add data rows
  for (let i = 0; i < formatted.rows.length; i++) {
    // Extract only requested columns from the row
    if (customColumns && customColumns.length > 0) {
      const rowData = data[i] as Record<string, unknown>
      const filteredRow = customColumns.map((col) => toCSVValue(rowData[col])).join(',')
      lines.push(filteredRow)
    } else {
      lines.push(formatted.rows[i])
    }
  }

  return lines.join('\n')
}

/**
 * Handle OPTIONS request for CORS preflight
 */
function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  })
}

/**
 * Handle report generation request
 */
async function handleReportRequest(request: Request): Promise<Response> {
  const startTime = performance.now()

  try {
    // Validate JWT token
    const authHeader = request.headers.get('authorization')
    const user = await validateJWT(authHeader)

    if (!user) {
      console.error('Unauthorized request: Invalid or missing JWT token')
      return createErrorResponse(401, 'Unauthorized: Invalid or missing JWT token')
    }

    console.log(`Report request from user: ${user.email} (${user.role})`)

    // Parse request
    const url = new URL(request.url)
    const reportType = url.searchParams.get('type') as ReportType | null
    const format = url.searchParams.get('format') || 'json' // json, csv, pdf

    if (!reportType) {
      return createErrorResponse(400, 'Missing required parameter: type')
    }

    // Validate report type
    const validReportTypes: ReportType[] = ['audit-logs', 'verification-reports', 'property-listings']
    if (!validReportTypes.includes(reportType)) {
      return createErrorResponse(400, `Invalid report type: ${reportType}`)
    }

    // Check role-based access
    const roleRequirements: Record<ReportType, UserRole[]> = {
      'audit-logs': ['staff', 'verifier', 'chief_registrar', 'admin'],
      'verification-reports': ['staff', 'verifier', 'chief_registrar', 'admin'],
      'property-listings': ['staff', 'verifier', 'chief_registrar', 'admin'],
    }

    if (!hasRequiredRole(user.role, roleRequirements[reportType])) {
      console.error(`Access denied: User ${user.email} (${user.role}) attempted to access ${reportType}`)
      return createErrorResponse(403, 'Forbidden: Insufficient permissions')
    }

    // Parse filters from query parameters
    const filters: Record<string, string> = {}
    const filterKeys = ['startDate', 'endDate', 'actionType', 'actorId', 'status', 'verifierId', 'propertyNumber']
    for (const key of filterKeys) {
      const value = url.searchParams.get(key)
      if (value) {
        filters[key] = value
      }
    }

    // Parse custom columns for CSV export
    const columnsParam = url.searchParams.get('columns')
    const customColumns = columnsParam ? columnsParam.split(',').map((c) => c.trim()) : undefined

    // Fetch report data based on type
    type ReportResult = { data: unknown[]; total: number; page: number; pageSize: number; totalPages: number }
    let reportResult: ReportResult

    switch (reportType) {
      case 'audit-logs':
        reportResult = await getAuditLogsReport(user.userId, user.role, filters)
        break
      case 'verification-reports':
        reportResult = await getVerificationReports(user.userId, user.role, filters)
        break
      case 'property-listings':
        reportResult = await getPropertyListings(user.userId, user.role, filters)
        break
    }

    const reportData = reportResult.data

    // Log performance
    const duration = performance.now() - startTime
    console.log(
      `Report generated: type=${reportType}, format=${format}, records=${reportData.length}, total=${reportResult.total}, page=${reportResult.page}/${reportResult.totalPages}, duration=${duration.toFixed(2)}ms, user=${user.email}`
    )

    // Return data based on format
    if (format === 'json') {
      return createSuccessResponse({
        success: true,
        type: reportType,
        format: 'json',
        recordCount: reportData.length,
        total: reportResult.total,
        page: reportResult.page,
        pageSize: reportResult.pageSize,
        totalPages: reportResult.totalPages,
        data: reportData,
        generatedAt: new Date().toISOString(),
        generatedBy: user.email,
      })
    } else if (format === 'csv') {
      // Generate CSV content
      try {
        const csvContent = generateCSV(reportType, reportData, customColumns)

        // Return CSV with appropriate headers
        return new Response(csvContent, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${reportType}-${new Date().toISOString().split('T')[0]}.csv"`,
          },
        })
      } catch (error) {
        console.error('CSV generation error:', error)
        return createErrorResponse(
          500,
          'Failed to generate CSV',
          {
            message: error instanceof Error ? error.message : 'Unknown error',
          }
        )
      }
    } else if (format === 'pdf') {
      // Generate PDF (HTML format for client-side conversion or printing)
      try {
        // Get analytics data for executive summaries and compliance reports
        let analytics: Awaited<ReturnType<typeof getAnalyticsData>> | undefined
        if (reportType === 'verification-reports' || reportType === 'audit-logs') {
          try {
            analytics = await getAnalyticsData(user.userId, user.role, filters)
          } catch (error) {
            console.warn('Failed to fetch analytics data:', error)
            // Continue without analytics
          }
        }

        // Generate HTML report
        const htmlContent = generatePDFHTML(reportType, reportData, analytics, {
          generatedBy: user.email,
          generatedAt: new Date().toISOString(),
          filters,
        })

        // Return HTML that can be converted to PDF client-side or printed
        // In production, this could be converted server-side using a service
        return new Response(htmlContent, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Disposition': `inline; filename="${reportType}-${new Date().toISOString().split('T')[0]}.html"`,
          },
        })
      } catch (error) {
        console.error('PDF generation error:', error)
        return createErrorResponse(
          500,
          'Failed to generate PDF',
          {
            message: error instanceof Error ? error.message : 'Unknown error',
          }
        )
      }
    } else {
      return createErrorResponse(400, `Unsupported format: ${format}`)
    }
  } catch (error) {
    const duration = performance.now() - startTime
    console.error(`Report generation error after ${duration.toFixed(2)}ms:`, error)

    return createErrorResponse(
      500,
      'Internal server error',
      {
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration.toFixed(2)}ms`,
      }
    )
  }
}

/**
 * Main handler
 */
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleOptions()
  }

  // Handle report generation
  if (req.method === 'GET' || req.method === 'POST') {
    return handleReportRequest(req)
  }

  // Method not allowed
  return createErrorResponse(405, 'Method not allowed')
})
