/**
 * Analytics Database Operations
 * 
 * Database operations for organization-wide analytics and statistics
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Organization-wide statistics
 */
export interface OrganizationStats {
  totalDocuments: number
  totalProperties: number
  totalVerifications: number
  documentsByStatus: {
    pending: number
    hashed: number
    verified: number
    rejected: number
    flagged: number
  }
  verificationsByStatus: {
    verified: number
    rejected: number
  }
  propertiesByStatus: {
    active: number
    inactive: number
    pending: number
    archived: number
  }
}

/**
 * Get organization-wide statistics
 */
export async function getOrganizationStats(): Promise<OrganizationStats> {
  const supabase = await createClient()

  // Get total counts
  const [documentsResult, propertiesResult, verificationsResult] = await Promise.all([
    supabase.from('ver_documents').select('id, status', { count: 'exact', head: false }),
    supabase.from('ver_properties').select('id, status', { count: 'exact', head: false }),
    supabase.from('ver_verifications').select('id, status', { count: 'exact', head: false }),
  ])

  const documents = documentsResult.data || []
  const properties = propertiesResult.data || []
  const verifications = verificationsResult.data || []

  // Count by status
  const documentsByStatus = {
    pending: documents.filter((d) => d.status === 'pending').length,
    hashed: documents.filter((d) => d.status === 'hashed').length,
    verified: documents.filter((d) => d.status === 'verified').length,
    rejected: documents.filter((d) => d.status === 'rejected').length,
    flagged: documents.filter((d) => d.status === 'flagged').length,
  }

  const verificationsByStatus = {
    verified: verifications.filter((v) => v.status === 'verified').length,
    rejected: verifications.filter((v) => v.status === 'rejected').length,
  }

  const propertiesByStatus = {
    active: properties.filter((p) => p.status === 'active').length,
    inactive: properties.filter((p) => p.status === 'inactive').length,
    pending: properties.filter((p) => p.status === 'pending').length,
    archived: properties.filter((p) => p.status === 'archived').length,
  }

  return {
    totalDocuments: documents.length,
    totalProperties: properties.length,
    totalVerifications: verifications.length,
    documentsByStatus,
    verificationsByStatus,
    propertiesByStatus,
  }
}

/**
 * Rejection analysis data
 */
export interface RejectionAnalysis {
  totalRejections: number
  rejectionsByReason: Array<{
    reason: string
    count: number
    percentage: number
  }>
  rejectionsOverTime: Array<{
    date: string
    count: number
  }>
  rejectionsByVerifier: Array<{
    verifier_id: string
    verifier_email: string
    count: number
  }>
}

/**
 * Get rejection causes analysis
 */
export async function getRejectionAnalysis(): Promise<RejectionAnalysis> {
  const supabase = await createClient()

  // Get all rejected verifications
  const { data: rejections, error } = await supabase
    .from('ver_verifications')
    .select('id, reason, verifier_id, created_at')
    .eq('status', 'rejected')
    .order('created_at', { ascending: false })

  if (error || !rejections) {
    return {
      totalRejections: 0,
      rejectionsByReason: [],
      rejectionsOverTime: [],
      rejectionsByVerifier: [],
    }
  }

  // Group by reason
  const reasonCounts: Record<string, number> = {}
  rejections.forEach((r) => {
    const reason = r.reason || 'No reason provided'
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1
  })

  const totalRejections = rejections.length
  const rejectionsByReason = Object.entries(reasonCounts)
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: (count / totalRejections) * 100,
    }))
    .sort((a, b) => b.count - a.count)

  // Group by date
  const dateCounts: Record<string, number> = {}
  rejections.forEach((r) => {
    const date = new Date(r.created_at).toISOString().split('T')[0]
    dateCounts[date] = (dateCounts[date] || 0) + 1
  })

  const rejectionsOverTime = Object.entries(dateCounts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Group by verifier
  const verifierCounts: Record<string, number> = {}
  rejections.forEach((r) => {
    verifierCounts[r.verifier_id] = (verifierCounts[r.verifier_id] || 0) + 1
  })

  // Get verifier emails
  const verifierIds = Object.keys(verifierCounts)
  const { data: verifiers } = await supabase
    .from('ver_profiles')
    .select('id, email')
    .in('id', verifierIds)

  const verifierMap = new Map(verifiers?.map((v) => [v.id, v.email]) || [])

  const rejectionsByVerifier = Object.entries(verifierCounts)
    .map(([verifier_id, count]) => ({
      verifier_id,
      verifier_email: verifierMap.get(verifier_id) || 'Unknown',
      count,
    }))
    .sort((a, b) => b.count - a.count)

  return {
    totalRejections,
    rejectionsByReason,
    rejectionsOverTime,
    rejectionsByVerifier,
  }
}

/**
 * Get documents over time for trend analysis
 */
export async function getDocumentsOverTime(days: number = 30): Promise<Array<{ date: string; count: number }>> {
  const supabase = await createClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data: documents, error } = await supabase
    .from('ver_documents')
    .select('created_at')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true })

  if (error || !documents) {
    return []
  }

  const dateCounts: Record<string, number> = {}
  documents.forEach((doc) => {
    const date = new Date(doc.created_at).toISOString().split('T')[0]
    dateCounts[date] = (dateCounts[date] || 0) + 1
  })

  return Object.entries(dateCounts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
