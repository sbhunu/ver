# Scheduled Reports Edge Function

Supabase Edge Function for processing scheduled reports and sending email deliveries.

## Features

- Processes scheduled reports from `ver_report_schedules` table
- Generates reports via reports Edge Function
- Sends email deliveries with report attachments
- Retry logic for failed deliveries
- Unsubscribe support
- Delivery status tracking

## Environment Variables

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
- `REPORTS_FUNCTION_URL`: URL to reports Edge Function (defaults to `${SUPABASE_URL}/functions/v1/reports`)
- `SMTP_HOST`: SMTP server hostname
- `SMTP_PORT`: SMTP server port (default: 587)
- `SMTP_USER`: SMTP username
- `SMTP_PASSWORD`: SMTP password
- `SMTP_FROM_EMAIL`: From email address (default: noreply@ver-system.com)
- `SMTP_FROM_NAME`: From name (default: VER System)

## Scheduling

This function should be called periodically (e.g., every hour) to check for due schedules. You can:

1. **Use pg_cron** (if available in your Supabase instance):
   ```sql
   SELECT cron.schedule(
     'process-scheduled-reports',
     '0 * * * *', -- Every hour
     $$
     SELECT net.http_post(
       url := 'https://<project-ref>.supabase.co/functions/v1/scheduled-reports',
       headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
     ) AS request_id;
     $$
   );
   ```

2. **Use external cron service** (e.g., cron-job.org, EasyCron):
   - Set up HTTP request to this function URL
   - Frequency: Every hour or as needed

3. **Manual trigger**:
   ```bash
   curl -X POST \
     'https://<project-ref>.supabase.co/functions/v1/scheduled-reports' \
     -H 'Authorization: Bearer <service-role-key>'
   ```

## Email Delivery

Currently, email sending is logged but not fully implemented. To enable email delivery:

1. **Option 1: Use SendGrid**
   - Sign up for SendGrid account
   - Get API key
   - Implement SendGrid API integration in `sendEmail()` function

2. **Option 2: Use Resend**
   - Sign up for Resend account
   - Get API key
   - Implement Resend API integration

3. **Option 3: Use Supabase Email** (if available)
   - Configure SMTP in Supabase dashboard
   - Use Supabase's email API

4. **Option 4: Use AWS SES**
   - Configure AWS SES
   - Implement AWS SDK integration

## Retry Logic

- Maximum 3 retry attempts
- Exponential backoff (5 seconds * retry count)
- Delivery status tracked in `ver_report_deliveries` table

## Unsubscribe

Users can unsubscribe from scheduled reports:
- Unsubscribe token stored in `ver_email_preferences`
- Unsubscribe URL included in email footer
- Unsubscribed users' schedules are automatically disabled

## Delivery Tracking

All email deliveries are tracked in `ver_report_deliveries` table with:
- Status (pending, sent, failed, retrying)
- Retry count
- Error messages
- Sent timestamp
