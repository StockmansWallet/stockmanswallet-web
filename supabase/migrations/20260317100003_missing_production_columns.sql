-- ============================================================================
-- MISSING PRODUCTION COLUMNS
-- ============================================================================
-- Columns that were added directly in the Singapore production database
-- but never captured in migration files. Captured here for completeness.
-- All use IF NOT EXISTS to be idempotent.
-- ============================================================================

-- user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
-- display_name should be nullable (Apple Sign In may not provide a name)
ALTER TABLE user_profiles ALTER COLUMN display_name DROP NOT NULL;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS business_type TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS advisor_role TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS business_address TEXT;

-- brangus
ALTER TABLE brangus_config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE brangus_conversations ADD COLUMN IF NOT EXISTS preview_text TEXT;
ALTER TABLE brangus_messages ADD COLUMN IF NOT EXISTS cards_json JSONB;

-- connection_requests
ALTER TABLE connection_requests ADD COLUMN IF NOT EXISTS connection_type TEXT;

-- waitlist
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS source TEXT;

-- mla_national_indicators
ALTER TABLE mla_national_indicators ADD COLUMN IF NOT EXISTS change DOUBLE PRECISION;
ALTER TABLE mla_national_indicators ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE mla_national_indicators ADD COLUMN IF NOT EXISTS indicator_code TEXT;
ALTER TABLE mla_national_indicators ADD COLUMN IF NOT EXISTS report_date DATE;
ALTER TABLE mla_national_indicators ADD COLUMN IF NOT EXISTS trend TEXT;
ALTER TABLE mla_national_indicators ADD COLUMN IF NOT EXISTS value DOUBLE PRECISION;

-- mla_physical_reports
ALTER TABLE mla_physical_reports ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE mla_physical_reports ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE mla_physical_reports ADD COLUMN IF NOT EXISTS report_data JSONB;
ALTER TABLE mla_physical_reports ADD COLUMN IF NOT EXISTS report_date DATE;
ALTER TABLE mla_physical_reports ADD COLUMN IF NOT EXISTS report_summary TEXT;
ALTER TABLE mla_physical_reports ADD COLUMN IF NOT EXISTS total_yarding INTEGER;
