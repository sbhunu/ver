/**
 * Process Report Jobs Edge Function
 * 
 * Background job processor for heavy report generation.
 * Processes pending report jobs and updates progress.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const REPORTS_FUNCTION_URL = Deno.env.get('REPORTS_FUNCTION_URL') || `${SUPABASE_URL}/functions/v1/reports`

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * Process a single report job
 */
async function processJob(job: {
  id: string
  user_id: string
  report_type: string
  format: string
  filters: Record<string, unknown>
}): Promise<void> {
  console.log(`Processing job ${job.id}`)

  // Mark job as processing
  await supabase
    .from('ver_report_jobs')
    .update({
      status: 'processing',
      started_at: new Date().toISOString(),
      progress: 0,
      progress_message: 'Starting report generation...',
    })
    .eq('id', job.id)

  try {
    // Get user token (simplified - in production, use proper token management)
    const userToken = SUPABASE_SERVICE_ROLE_KEY

    // Update progress
    await supabase
      .from('ver_report_jobs')
      .update({
        progress: 25,
        progress_message: 'Fetching data...',
      })
      .eq('id', job.id)

    // Generate report via reports Edge Function
    const params = new URLSearchParams({
      type: job.report_type,
      format: job.format,
      ...Object.fromEntries(
        Object.entries(job.filters).map(([k, v]) => [k, String(v)])
      ),
    })

    const url = `${REPORTS_FUNCTION_URL}?${params.toString()}`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Report generation failed: ${response.status}`)
    }

    // Update progress
    await supabase
      .from('ver_report_jobs')
      .update({
        progress: 75,
        progress_message: 'Processing report...',
      })
      .eq('id', job.id)

    // Get report data
    const reportData = await response.blob()

    // Store report in storage
    const storagePath = `report-jobs/${job.id}-${Date.now()}.${job.format === 'csv' ? 'csv' : job.format === 'pdf' ? 'html' : 'json'}`

    const { error: uploadError } = await supabase.storage
      .from('report-cache')
      .upload(storagePath, reportData, {
        contentType:
          job.format === 'csv'
            ? 'text/csv'
            : job.format === 'pdf'
            ? 'text/html'
            : 'application/json',
        upsert: true,
      })

    if (uploadError) {
      throw new Error(`Failed to store report: ${uploadError.message}`)
    }

    // Mark job as completed
    await supabase
      .from('ver_report_jobs')
      .update({
        status: 'completed',
        progress: 100,
        progress_message: 'Report generated successfully',
        result_storage_path: storagePath,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id)

    console.log(`Job ${job.id} completed successfully`)
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error)

    // Mark job as failed
    await supabase
      .from('ver_report_jobs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id)
  }
}

/**
 * Main handler
 */
Deno.serve(async (req: Request) => {
  try {
    console.log('Processing report jobs')

    // Get pending jobs
    const { data: jobs, error } = await supabase
      .from('ver_report_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10)

    if (error) {
      throw error
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No pending jobs', processed: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing ${jobs.length} job(s)`)

    // Process jobs sequentially
    const results = []
    for (const job of jobs) {
      try {
        await processJob(job)
        results.push({ jobId: job.id, success: true })
      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error)
        results.push({
          jobId: job.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const successCount = results.filter((r) => r.success).length

    return new Response(
      JSON.stringify({
        success: true,
        processed: jobs.length,
        successful: successCount,
        failed: jobs.length - successCount,
        results,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Process report jobs error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
