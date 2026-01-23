-- Report Scheduling and Email Delivery System
-- Implements scheduled report generation with email delivery

-- ============================================================================
-- Create Report Schedules Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS ver_report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES ver_profiles(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL CHECK (report_type IN ('audit-logs', 'verification-reports', 'property-listings')),
    format TEXT NOT NULL DEFAULT 'pdf' CHECK (format IN ('json', 'csv', 'pdf')),
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday (for weekly)
    day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 28), -- 1-28 (for monthly)
    time_of_day TIME NOT NULL DEFAULT '09:00:00', -- Default 9 AM
    timezone TEXT NOT NULL DEFAULT 'UTC',
    filters JSONB NOT NULL DEFAULT '{}'::jsonb, -- Store report filters
    email_recipients TEXT[] NOT NULL, -- Array of email addresses
    enabled BOOLEAN NOT NULL DEFAULT true,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_weekly_schedule CHECK (
        frequency != 'weekly' OR day_of_week IS NOT NULL
    ),
    CONSTRAINT valid_monthly_schedule CHECK (
        frequency != 'monthly' OR day_of_month IS NOT NULL
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ver_report_schedules_user_id ON ver_report_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_ver_report_schedules_enabled ON ver_report_schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_ver_report_schedules_next_run_at ON ver_report_schedules(next_run_at);
CREATE INDEX IF NOT EXISTS idx_ver_report_schedules_frequency ON ver_report_schedules(frequency);

-- ============================================================================
-- Create Report Delivery Logs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS ver_report_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES ver_report_schedules(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL,
    format TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'retrying')),
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ver_report_deliveries_schedule_id ON ver_report_deliveries(schedule_id);
CREATE INDEX IF NOT EXISTS idx_ver_report_deliveries_status ON ver_report_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_ver_report_deliveries_recipient_email ON ver_report_deliveries(recipient_email);
CREATE INDEX IF NOT EXISTS idx_ver_report_deliveries_created_at ON ver_report_deliveries(created_at);

-- ============================================================================
-- Create User Email Preferences Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS ver_email_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES ver_profiles(id) ON DELETE CASCADE,
    email_unsubscribed BOOLEAN NOT NULL DEFAULT false,
    unsubscribe_token TEXT UNIQUE, -- For unsubscribe links
    preferred_email TEXT, -- Override default email
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_email_preferences UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ver_email_preferences_user_id ON ver_email_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_ver_email_preferences_unsubscribe_token ON ver_email_preferences(unsubscribe_token);

-- ============================================================================
-- Function to Calculate Next Run Time
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_next_run_time(
    p_frequency TEXT,
    p_day_of_week INTEGER,
    p_day_of_month INTEGER,
    p_time_of_day TIME,
    p_timezone TEXT,
    p_last_run_at TIMESTAMPTZ DEFAULT NULL
) RETURNS TIMESTAMPTZ AS $$
DECLARE
    v_next_run TIMESTAMPTZ;
    v_current_time TIMESTAMPTZ;
    v_target_date DATE;
    v_target_time TIME;
BEGIN
    -- Get current time in specified timezone
    v_current_time := NOW() AT TIME ZONE p_timezone;
    
    -- Set target time
    v_target_time := p_time_of_day;
    
    IF p_frequency = 'daily' THEN
        -- Daily: next run is tomorrow at specified time
        v_target_date := (v_current_time::DATE + INTERVAL '1 day');
        v_next_run := (v_target_date::TEXT || ' ' || v_target_time::TEXT)::TIMESTAMPTZ AT TIME ZONE p_timezone;
        
    ELSIF p_frequency = 'weekly' THEN
        -- Weekly: next run is on specified day of week
        v_target_date := v_current_time::DATE;
        
        -- Calculate days until target day of week
        WHILE EXTRACT(DOW FROM v_target_date)::INTEGER != p_day_of_week LOOP
            v_target_date := v_target_date + INTERVAL '1 day';
        END LOOP;
        
        -- If today is the target day and time hasn't passed, use today
        IF v_target_date = v_current_time::DATE AND v_target_time > v_current_time::TIME THEN
            -- Use today
        ELSE
            -- Otherwise, use next week
            v_target_date := v_target_date + INTERVAL '1 week';
        END IF;
        
        v_next_run := (v_target_date::TEXT || ' ' || v_target_time::TEXT)::TIMESTAMPTZ AT TIME ZONE p_timezone;
        
    ELSIF p_frequency = 'monthly' THEN
        -- Monthly: next run is on specified day of month
        v_target_date := v_current_time::DATE;
        
        -- Set to target day of current month
        v_target_date := DATE_TRUNC('month', v_target_date) + (p_day_of_month - 1) * INTERVAL '1 day';
        
        -- If target date has passed this month, use next month
        IF v_target_date < v_current_time::DATE OR 
           (v_target_date = v_current_time::DATE AND v_target_time <= v_current_time::TIME) THEN
            v_target_date := v_target_date + INTERVAL '1 month';
        END IF;
        
        v_next_run := (v_target_date::TEXT || ' ' || v_target_time::TEXT)::TIMESTAMPTZ AT TIME ZONE p_timezone;
    ELSE
        RAISE EXCEPTION 'Invalid frequency: %', p_frequency;
    END IF;
    
    RETURN v_next_run;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function to Update Next Run Time
-- ============================================================================

CREATE OR REPLACE FUNCTION update_schedule_next_run()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.last_run_at IS NOT NULL AND NEW.last_run_at != OLD.last_run_at THEN
        NEW.next_run_at := calculate_next_run_time(
            NEW.frequency,
            NEW.day_of_week,
            NEW.day_of_month,
            NEW.time_of_day,
            NEW.timezone,
            NEW.last_run_at
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update next_run_at when schedule runs
CREATE TRIGGER on_report_schedule_run
    BEFORE UPDATE ON ver_report_schedules
    FOR EACH ROW
    WHEN (NEW.last_run_at IS DISTINCT FROM OLD.last_run_at)
    EXECUTE FUNCTION update_schedule_next_run();

-- Function to set initial next_run_at on insert
CREATE OR REPLACE FUNCTION set_initial_next_run_time()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.next_run_at IS NULL THEN
        NEW.next_run_at := calculate_next_run_time(
            NEW.frequency,
            NEW.day_of_week,
            NEW.day_of_month,
            NEW.time_of_day,
            NEW.timezone,
            NULL
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set initial next_run_at on insert
CREATE TRIGGER on_report_schedule_insert
    BEFORE INSERT ON ver_report_schedules
    FOR EACH ROW
    EXECUTE FUNCTION set_initial_next_run_time();

-- ============================================================================
-- Function to Generate Unsubscribe Token
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_unsubscribe_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS Policies for Report Schedules
-- ============================================================================

ALTER TABLE ver_report_schedules ENABLE ROW LEVEL SECURITY;

-- Users can view their own schedules
CREATE POLICY "Users can view own schedules"
    ON ver_report_schedules
    FOR SELECT
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM ver_profiles
        WHERE id = auth.uid() AND role IN ('chief_registrar', 'admin')
    ));

-- Users can create their own schedules
CREATE POLICY "Users can create own schedules"
    ON ver_report_schedules
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can update their own schedules
CREATE POLICY "Users can update own schedules"
    ON ver_report_schedules
    FOR UPDATE
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM ver_profiles
        WHERE id = auth.uid() AND role IN ('chief_registrar', 'admin')
    ));

-- Users can delete their own schedules
CREATE POLICY "Users can delete own schedules"
    ON ver_report_schedules
    FOR DELETE
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM ver_profiles
        WHERE id = auth.uid() AND role IN ('chief_registrar', 'admin')
    ));

-- ============================================================================
-- RLS Policies for Report Deliveries
-- ============================================================================

ALTER TABLE ver_report_deliveries ENABLE ROW LEVEL SECURITY;

-- Users can view deliveries for their schedules
CREATE POLICY "Users can view own deliveries"
    ON ver_report_deliveries
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM ver_report_schedules
        WHERE ver_report_schedules.id = ver_report_deliveries.schedule_id
        AND (ver_report_schedules.user_id = auth.uid() OR EXISTS (
            SELECT 1 FROM ver_profiles
            WHERE id = auth.uid() AND role IN ('chief_registrar', 'admin')
        ))
    ));

-- Only system can create deliveries (via Edge Function)
CREATE POLICY "System can create deliveries"
    ON ver_report_deliveries
    FOR INSERT
    WITH CHECK (true); -- Edge Function uses service role

-- Only system can update deliveries
CREATE POLICY "System can update deliveries"
    ON ver_report_deliveries
    FOR UPDATE
    USING (true); -- Edge Function uses service role

-- ============================================================================
-- RLS Policies for Email Preferences
-- ============================================================================

ALTER TABLE ver_email_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view own preferences"
    ON ver_email_preferences
    FOR SELECT
    USING (user_id = auth.uid());

-- Users can create their own preferences
CREATE POLICY "Users can create own preferences"
    ON ver_email_preferences
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences"
    ON ver_email_preferences
    FOR UPDATE
    USING (user_id = auth.uid());
