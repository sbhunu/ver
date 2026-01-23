/**
 * Unsubscribe API Route
 * 
 * Handles email unsubscribe requests
 */

import { NextRequest, NextResponse } from 'next/server'
import { unsubscribeByToken } from '@/lib/db/email-preferences'
import { handleApiError } from '@/lib/errors'

/**
 * GET /api/unsubscribe
 * 
 * Unsubscribe user from emails using token
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const token = url.searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const success = await unsubscribeByToken(token)

    if (!success) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    // Return HTML confirmation page
    return new NextResponse(
      `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Unsubscribed</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #f8fafc;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      text-align: center;
      max-width: 500px;
    }
    h1 { color: #2563eb; margin-bottom: 20px; }
    p { color: #666; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <h1>✓ Successfully Unsubscribed</h1>
    <p>You have been unsubscribed from scheduled report emails.</p>
    <p>All your scheduled reports have been disabled.</p>
    <p>If you change your mind, you can re-enable them from your dashboard.</p>
  </div>
</body>
</html>
      `,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }
    )
  } catch (error) {
    return handleApiError(error)
  }
}
