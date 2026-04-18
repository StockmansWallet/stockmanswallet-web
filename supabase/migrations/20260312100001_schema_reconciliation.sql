-- ============================================================================
-- SCHEMA RECONCILIATION
-- ============================================================================
-- Captures schema objects that were created directly in production but never
-- recorded in migration files. All statements use IF NOT EXISTS / IF EXISTS
-- guards so this migration is idempotent: safe on prod (no-ops) and correct
-- on a fresh database (creates everything).
--
-- Covers:
--   A. 6 missing CREATE TABLE statements
--   B. 6 missing ALTER TABLE ADD COLUMN statements
--   C. 3 missing functions
--   D. Updated purge cron job (adds consignments + consignment_allocations)
--   E. Cleanup of duplicate legacy triggers
-- ============================================================================


-- ============================================================================
-- A1. HISTORICAL MARKET PRICES
-- Legacy price history table. Public read, no user ownership.
-- ============================================================================
CREATE TABLE IF NOT EXISTS historical_market_prices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category        TEXT NOT NULL,
    saleyard        TEXT NOT NULL,
    state           TEXT NOT NULL,
    price_per_kg    DOUBLE PRECISION NOT NULL,
    price_date      DATE NOT NULL,
    source          TEXT NOT NULL,
    is_historical   BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (category, saleyard, price_date)
);

ALTER TABLE historical_market_prices ENABLE ROW LEVEL SECURITY;

-- Public read (idempotent: policy name is unique per table)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'historical_market_prices'
          AND policyname = 'Allow anonymous read access to historical prices'
    ) THEN
        CREATE POLICY "Allow anonymous read access to historical prices"
            ON historical_market_prices FOR SELECT USING (true);
    END IF;
END $$;

-- Indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_historical_market_prices_lookup
    ON historical_market_prices(category, saleyard, state);
CREATE INDEX IF NOT EXISTS idx_historical_prices_category_date
    ON historical_market_prices(category, price_date DESC);
CREATE INDEX IF NOT EXISTS idx_historical_prices_date
    ON historical_market_prices(price_date DESC);
CREATE INDEX IF NOT EXISTS idx_historical_prices_saleyard
    ON historical_market_prices(saleyard);


-- ============================================================================
-- A2. SMART MAPPING RULES
-- Category auto-mapping rules for MLA data. Public read.
-- Note: trigger and indexes were already referenced in 20260227 migrations
-- but the CREATE TABLE was missing.
-- ============================================================================
CREATE TABLE IF NOT EXISTS smart_mapping_rules (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name           TEXT NOT NULL UNIQUE,
    conditions          JSONB NOT NULL,
    target_category     TEXT NOT NULL,
    target_mla_category TEXT,
    priority            INTEGER DEFAULT 100,
    active              BOOLEAN DEFAULT true,
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE smart_mapping_rules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'smart_mapping_rules'
          AND policyname = 'Allow anonymous read access to smart mapping rules'
    ) THEN
        CREATE POLICY "Allow anonymous read access to smart mapping rules"
            ON smart_mapping_rules FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'smart_mapping_rules'
          AND policyname = 'Allow authenticated read access to smart mapping rules'
    ) THEN
        CREATE POLICY "Allow authenticated read access to smart mapping rules"
            ON smart_mapping_rules FOR SELECT USING (true);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_smart_mapping_priority
    ON smart_mapping_rules(priority, active) WHERE active = true;

-- Trigger already created in 20260227100001 but guard it anyway
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'set_updated_at'
          AND tgrelid = 'smart_mapping_rules'::regclass
    ) THEN
        CREATE TRIGGER set_updated_at
            BEFORE UPDATE ON smart_mapping_rules
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;


-- ============================================================================
-- A3. MLA SALEYARD REPORTS
-- Per-saleyard MLA report data. Public read + service role write.
-- ============================================================================
CREATE TABLE IF NOT EXISTS mla_saleyard_reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saleyard_name   TEXT NOT NULL,
    state           TEXT,
    report_date     DATE NOT NULL,
    yardings        INTEGER,
    summary         TEXT,
    categories      JSONB,
    fetched_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,

    UNIQUE (saleyard_name, report_date)
);

ALTER TABLE mla_saleyard_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'mla_saleyard_reports'
          AND policyname = 'Allow authenticated read access'
    ) THEN
        CREATE POLICY "Allow authenticated read access"
            ON mla_saleyard_reports FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'mla_saleyard_reports'
          AND policyname = 'Allow service role full access'
    ) THEN
        CREATE POLICY "Allow service role full access"
            ON mla_saleyard_reports FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_saleyard_reports_state
    ON mla_saleyard_reports(state, report_date DESC);


-- ============================================================================
-- A4. SAMPLE HERDS
-- Demo/onboarding sample herd data. Public read, no user ownership.
-- ============================================================================
CREATE TABLE IF NOT EXISTS sample_herds (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    TEXT NOT NULL,
    species                 TEXT NOT NULL,
    breed                   TEXT NOT NULL,
    sex                     TEXT NOT NULL,
    category                TEXT NOT NULL,
    age_months              INTEGER NOT NULL,
    head_count              INTEGER NOT NULL,
    initial_weight          DOUBLE PRECISION NOT NULL,
    current_weight          DOUBLE PRECISION NOT NULL,
    daily_weight_gain       DOUBLE PRECISION NOT NULL,
    is_breeder              BOOLEAN DEFAULT false,
    calving_rate            DOUBLE PRECISION DEFAULT 0.0,
    paddock_name            TEXT,
    selected_saleyard       TEXT,
    animal_id_number        TEXT,
    additional_info         TEXT,
    is_pregnant             BOOLEAN DEFAULT false,
    joined_date             TIMESTAMPTZ,
    dwg_change_date         TIMESTAMPTZ,
    previous_dwg            DOUBLE PRECISION,
    days_offset             INTEGER DEFAULT 0,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sample_herds ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'sample_herds'
          AND policyname = 'Allow anonymous read access to sample herds'
    ) THEN
        CREATE POLICY "Allow anonymous read access to sample herds"
            ON sample_herds FOR SELECT USING (true);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sample_herds_species
    ON sample_herds(species);


-- ============================================================================
-- A5. ADVISORY MESSAGES
-- Advisor-farmer messaging within connections. RLS scoped to connection
-- participants only.
-- ============================================================================
CREATE TABLE IF NOT EXISTS advisory_messages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id       UUID NOT NULL REFERENCES connection_requests(id),
    sender_user_id      UUID NOT NULL REFERENCES auth.users(id),
    message_type        TEXT NOT NULL DEFAULT 'general_note'
        CHECK (message_type IN ('access_request', 'renewal_request', 'review_request', 'general_note')),
    content             TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE advisory_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'advisory_messages'
          AND policyname = 'advisory_messages_select'
    ) THEN
        CREATE POLICY "advisory_messages_select" ON advisory_messages
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM connection_requests cr
                    WHERE cr.id = advisory_messages.connection_id
                      AND (cr.requester_user_id = auth.uid() OR cr.target_user_id = auth.uid())
                )
            );
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'advisory_messages'
          AND policyname = 'advisory_messages_insert'
    ) THEN
        CREATE POLICY "advisory_messages_insert" ON advisory_messages
            FOR INSERT WITH CHECK (
                sender_user_id = auth.uid()
                AND EXISTS (
                    SELECT 1 FROM connection_requests cr
                    WHERE cr.id = advisory_messages.connection_id
                      AND (cr.requester_user_id = auth.uid() OR cr.target_user_id = auth.uid())
                )
            );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_advisory_messages_connection
    ON advisory_messages(connection_id, created_at);
CREATE INDEX IF NOT EXISTS idx_advisory_messages_sender
    ON advisory_messages(sender_user_id);


-- ============================================================================
-- A6. NOTIFICATIONS
-- In-app notification system. RLS scoped to owning user.
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES auth.users(id),
    type                    TEXT NOT NULL
        CHECK (type IN (
            'new_connection_request', 'request_approved', 'request_denied',
            'access_expired', 'new_message', 'renewal_requested'
        )),
    title                   TEXT NOT NULL,
    body                    TEXT,
    link                    TEXT,
    is_read                 BOOLEAN NOT NULL DEFAULT false,
    related_connection_id   UUID REFERENCES connection_requests(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'notifications'
          AND policyname = 'notifications_select'
    ) THEN
        CREATE POLICY "notifications_select" ON notifications
            FOR SELECT USING (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'notifications'
          AND policyname = 'notifications_update'
    ) THEN
        CREATE POLICY "notifications_update" ON notifications
            FOR UPDATE USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_user
    ON notifications(user_id, is_read, created_at DESC);


-- ============================================================================
-- B. MISSING COLUMNS ON EXISTING TABLES
-- Columns added directly to prod but never in a migration.
-- ============================================================================

-- consignments: user-facing name
ALTER TABLE consignments ADD COLUMN IF NOT EXISTS consignment_name TEXT;

-- kill_sheet_records: display name and original filename
ALTER TABLE kill_sheet_records ADD COLUMN IF NOT EXISTS record_name TEXT;
ALTER TABLE kill_sheet_records ADD COLUMN IF NOT EXISTS source_file_name TEXT;

-- processor_grids: display name and original filename
ALTER TABLE processor_grids ADD COLUMN IF NOT EXISTS grid_name TEXT;
ALTER TABLE processor_grids ADD COLUMN IF NOT EXISTS source_file_name TEXT;

-- grid_iq_analyses: per-category results breakdown
ALTER TABLE grid_iq_analyses ADD COLUMN IF NOT EXISTS category_results JSONB;


-- ============================================================================
-- C. MISSING FUNCTIONS
-- ============================================================================

-- C1. create_notification: inserts a notification with dedup for unread messages
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_body TEXT,
    p_link TEXT,
    p_related_connection_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Skip duplicate unread new_message notifications for same connection
    IF p_type = 'new_message' AND p_related_connection_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM notifications
            WHERE user_id = p_user_id
              AND type = 'new_message'
              AND related_connection_id = p_related_connection_id
              AND is_read = false
        ) THEN
            RETURN;
        END IF;
    END IF;

    INSERT INTO notifications (user_id, type, title, body, link, related_connection_id)
    VALUES (p_user_id, p_type, p_title, p_body, p_link, p_related_connection_id);
END;
$$;

-- C2. saleyard_coverage: query helper for categories/breeds per saleyard
CREATE OR REPLACE FUNCTION saleyard_coverage()
RETURNS TABLE(saleyard TEXT, categories TEXT[], breeds TEXT[])
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT
        saleyard,
        array_agg(DISTINCT category ORDER BY category) AS categories,
        array_agg(DISTINCT breed ORDER BY breed) FILTER (WHERE breed IS NOT NULL) AS breeds
    FROM category_prices
    WHERE saleyard <> 'National'
    GROUP BY saleyard
    ORDER BY saleyard;
$$;

-- C3. saleyard_stats: query helper for entry counts/dates per saleyard
CREATE OR REPLACE FUNCTION saleyard_stats(since_date DATE DEFAULT NULL)
RETURNS TABLE(
    saleyard TEXT,
    entry_count BIGINT,
    newest_date TEXT,
    oldest_date TEXT,
    categories TEXT[],
    breeds TEXT[],
    weight_ranges TEXT[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT
        saleyard,
        count(*)::bigint AS entry_count,
        max(data_date) AS newest_date,
        min(data_date) AS oldest_date,
        array_agg(DISTINCT category ORDER BY category) AS categories,
        array_agg(DISTINCT breed ORDER BY breed) FILTER (WHERE breed IS NOT NULL) AS breeds,
        array_agg(DISTINCT weight_range ORDER BY weight_range) FILTER (WHERE weight_range IS NOT NULL) AS weight_ranges
    FROM category_prices
    WHERE saleyard <> 'National'
      AND (since_date IS NULL OR data_date >= since_date)
    GROUP BY saleyard
    ORDER BY saleyard;
$$;


-- ============================================================================
-- D. UPDATE PURGE CRON JOB
-- Add consignments + consignment_allocations to the daily soft-delete purge.
-- Reschedules the existing job with the expanded table list.
-- ============================================================================
SELECT cron.unschedule('purge-soft-deleted-sync-records')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'purge-soft-deleted-sync-records'
);

SELECT cron.schedule(
    'purge-soft-deleted-sync-records',
    '0 3 * * *',
    $$
      -- Children first (FK dependencies)
      DELETE FROM consignment_allocations
        WHERE consignment_id IN (
            SELECT id FROM consignments
            WHERE is_deleted = true AND deleted_at < NOW() - INTERVAL '30 days'
        );
      DELETE FROM consignments          WHERE is_deleted = true AND deleted_at < NOW() - INTERVAL '30 days';
      DELETE FROM grid_iq_analyses      WHERE is_deleted = true AND deleted_at < NOW() - INTERVAL '30 days';
      DELETE FROM kill_sheet_records     WHERE is_deleted = true AND deleted_at < NOW() - INTERVAL '30 days';
      DELETE FROM sales_records          WHERE is_deleted = true AND deleted_at < NOW() - INTERVAL '30 days';
      DELETE FROM health_records         WHERE is_deleted = true AND deleted_at < NOW() - INTERVAL '30 days';
      DELETE FROM muster_records         WHERE is_deleted = true AND deleted_at < NOW() - INTERVAL '30 days';
      DELETE FROM yard_book_items        WHERE is_deleted = true AND deleted_at < NOW() - INTERVAL '30 days';
      DELETE FROM herds            WHERE is_deleted = true AND deleted_at < NOW() - INTERVAL '30 days';
      DELETE FROM properties             WHERE is_deleted = true AND deleted_at < NOW() - INTERVAL '30 days';
      DELETE FROM processor_grids        WHERE is_deleted = true AND deleted_at < NOW() - INTERVAL '30 days';
      DELETE FROM saved_freight_estimates WHERE is_deleted = true AND deleted_at < NOW() - INTERVAL '30 days';
      DELETE FROM custom_sale_locations  WHERE is_deleted = true AND deleted_at < NOW() - INTERVAL '30 days';
    $$
);


-- ============================================================================
-- E. CLEANUP DUPLICATE LEGACY TRIGGERS
-- connection_requests and user_profiles each have two triggers doing the
-- same thing (set updated_at = NOW()). Drop the legacy duplicates, keep
-- the standard set_updated_at trigger.
-- ============================================================================
-- ============================================================================
-- F. EXPAND dev_updates PLATFORM CHECK
-- Allow 'supabase' as a platform value for database/infrastructure changes.
-- ============================================================================
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dev_updates') THEN
        ALTER TABLE dev_updates DROP CONSTRAINT IF EXISTS dev_updates_platform_check;
        ALTER TABLE dev_updates ADD CONSTRAINT dev_updates_platform_check CHECK (platform IN ('ios', 'web', 'supabase'));
    END IF;
END $$;


-- ============================================================================
-- E. CLEANUP DUPLICATE LEGACY TRIGGERS
-- connection_requests and user_profiles each have two triggers doing the
-- same thing (set updated_at = NOW()). Drop the legacy duplicates, keep
-- the standard set_updated_at trigger.
-- ============================================================================
DROP TRIGGER IF EXISTS connection_requests_updated_at ON connection_requests;
DROP TRIGGER IF EXISTS user_profiles_updated_at ON user_profiles;

-- Drop the legacy functions only if no other triggers reference them
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgfoid = (
            SELECT oid FROM pg_proc
            WHERE proname = 'update_connection_requests_updated_at'
              AND pronamespace = 'public'::regnamespace
        )
    ) THEN
        DROP FUNCTION IF EXISTS update_connection_requests_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgfoid = (
            SELECT oid FROM pg_proc
            WHERE proname = 'update_user_profiles_updated_at'
              AND pronamespace = 'public'::regnamespace
        )
    ) THEN
        DROP FUNCTION IF EXISTS update_user_profiles_updated_at();
    END IF;
END $$;
