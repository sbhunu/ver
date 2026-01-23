'use client'

/**
 * Export Button Component
 * 
 * Provides data export functionality for analytics reports in CSV/PDF formats
 */

import { useState } from 'react'
import type { OrganizationStats } from '@/lib/db/analytics'
import type { RejectionAnalysis } from '@/lib/db/analytics'

export interface ExportButtonProps {
  stats: OrganizationStats
  rejectionAnalysis: RejectionAnalysis
  exportType: 'csv' | 'pdf'
}

export default function ExportButton({ stats, rejectionAnalysis, exportType }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)

    try {
      if (exportType === 'csv') {
        await exportToCSV()
      } else {
        await exportToPDF()
      }
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const exportToCSV = async () => {
    // Create CSV content
    const csvRows: string[] = []

    // Organization Stats
    csvRows.push('Organization Statistics')
    csvRows.push('Metric,Value')
    csvRows.push(`Total Documents,${stats.totalDocuments}`)
    csvRows.push(`Total Properties,${stats.totalProperties}`)
    csvRows.push(`Total Verifications,${stats.totalVerifications}`)
    csvRows.push('')
    csvRows.push('Documents by Status')
    csvRows.push('Status,Count')
    csvRows.push(`Pending,${stats.documentsByStatus.pending}`)
    csvRows.push(`Hashed,${stats.documentsByStatus.hashed}`)
    csvRows.push(`Verified,${stats.documentsByStatus.verified}`)
    csvRows.push(`Rejected,${stats.documentsByStatus.rejected}`)
    csvRows.push(`Flagged,${stats.documentsByStatus.flagged}`)
    csvRows.push('')
    csvRows.push('Rejection Analysis')
    csvRows.push('Reason,Count,Percentage')
    rejectionAnalysis.rejectionsByReason.forEach((item) => {
      csvRows.push(`"${item.reason}",${item.count},${item.percentage.toFixed(2)}%`)
    })

    // Create blob and download
    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `analytics-report-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = async () => {
    // Dynamic import of jsPDF
    const { jsPDF } = await import('jspdf')

    const doc = new jsPDF()
    let yPos = 20

    // Title
    doc.setFontSize(18)
    doc.text('Analytics Report', 14, yPos)
    yPos += 10

    // Organization Stats
    doc.setFontSize(14)
    doc.text('Organization Statistics', 14, yPos)
    yPos += 8

    doc.setFontSize(10)
    doc.text(`Total Documents: ${stats.totalDocuments}`, 14, yPos)
    yPos += 6
    doc.text(`Total Properties: ${stats.totalProperties}`, 14, yPos)
    yPos += 6
    doc.text(`Total Verifications: ${stats.totalVerifications}`, 14, yPos)
    yPos += 10

    // Documents by Status
    doc.setFontSize(12)
    doc.text('Documents by Status', 14, yPos)
    yPos += 8

    doc.setFontSize(10)
    doc.text(`Pending: ${stats.documentsByStatus.pending}`, 14, yPos)
    yPos += 6
    doc.text(`Hashed: ${stats.documentsByStatus.hashed}`, 14, yPos)
    yPos += 6
    doc.text(`Verified: ${stats.documentsByStatus.verified}`, 14, yPos)
    yPos += 6
    doc.text(`Rejected: ${stats.documentsByStatus.rejected}`, 14, yPos)
    yPos += 6
    doc.text(`Flagged: ${stats.documentsByStatus.flagged}`, 14, yPos)
    yPos += 10

    // Rejection Analysis
    if (rejectionAnalysis.totalRejections > 0) {
      doc.setFontSize(12)
      doc.text('Rejection Analysis', 14, yPos)
      yPos += 8

      doc.setFontSize(10)
      doc.text(`Total Rejections: ${rejectionAnalysis.totalRejections}`, 14, yPos)
      yPos += 10

      doc.text('Top Rejection Reasons:', 14, yPos)
      yPos += 6

      rejectionAnalysis.rejectionsByReason.slice(0, 10).forEach((item) => {
        if (yPos > 280) {
          doc.addPage()
          yPos = 20
        }
        doc.text(`${item.reason.substring(0, 80)}: ${item.count} (${item.percentage.toFixed(1)}%)`, 14, yPos)
        yPos += 6
      })
    }

    // Footer
    doc.setFontSize(8)
    doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 285)

    // Save PDF
    doc.save(`analytics-report-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        exportType === 'pdf'
          ? 'bg-red-600 text-white hover:bg-red-700'
          : 'bg-green-600 text-white hover:bg-green-700'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {isExporting ? 'Exporting...' : `Export ${exportType.toUpperCase()}`}
    </button>
  )
}
