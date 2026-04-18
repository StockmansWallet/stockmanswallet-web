-- ============================================================================
-- BOOTSTRAP: Foundational tables created directly in production
-- ============================================================================
-- These tables were created in the original Supabase project before migration
-- tracking was set up. They must exist before other migrations can run.
-- All use IF NOT EXISTS to be idempotent.
-- Schema dumped from production Singapore project (skgdpvsxwbtnxpgviteg).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CATEGORY PRICES (MLA market data)
-- ============================================================================
CREATE TABLE IF NOT EXISTS category_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    species TEXT NOT NULL,
    breed TEXT,
    breed_premium_pct DOUBLE PRECISION DEFAULT 0.0,
    base_price_per_kg DOUBLE PRECISION NOT NULL,
    final_price_per_kg DOUBLE PRECISION NOT NULL,
    weight_range TEXT,
    saleyard TEXT,
    state TEXT,
    grass_fed_premium_pct DOUBLE PRECISION DEFAULT 0.0,
    organic_premium_pct DOUBLE PRECISION DEFAULT 0.0,
    eu_accredited_premium_pct DOUBLE PRECISION DEFAULT 0.0,
    source TEXT NOT NULL,
    mla_category TEXT,
    data_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ
);

ALTER TABLE category_prices ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'category_prices' AND policyname = 'allow_public_read_category_prices') THEN
        CREATE POLICY allow_public_read_category_prices ON category_prices FOR SELECT USING (true);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_category_prices_lookup ON category_prices(category, saleyard, data_date DESC);

-- ============================================================================
-- BREED PREMIUMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS breed_premiums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    species TEXT NOT NULL,
    breed TEXT NOT NULL,
    category TEXT NOT NULL,
    premium_pct DOUBLE PRECISION NOT NULL,
    state TEXT,
    saleyard TEXT,
    source TEXT,
    confidence_score DOUBLE PRECISION DEFAULT 1.0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE breed_premiums ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'breed_premiums' AND policyname = 'allow_public_read_breed_premiums') THEN
        CREATE POLICY allow_public_read_breed_premiums ON breed_premiums FOR SELECT USING (true);
    END IF;
END $$;

-- ============================================================================
-- MLA NATIONAL INDICATORS
-- ============================================================================
CREATE TABLE IF NOT EXISTS mla_national_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    indicator_name TEXT NOT NULL,
    indicator_value DOUBLE PRECISION,
    unit TEXT,
    change_value DOUBLE PRECISION,
    change_percent DOUBLE PRECISION,
    data_date DATE,
    source TEXT DEFAULT 'MLA NLRS',
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    UNIQUE (indicator_name, data_date)
);

ALTER TABLE mla_national_indicators ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mla_national_indicators' AND policyname = 'allow_public_read_mla_indicators') THEN
        CREATE POLICY allow_public_read_mla_indicators ON mla_national_indicators FOR SELECT USING (true);
    END IF;
END $$;

-- ============================================================================
-- MLA HISTORICAL INDICATORS
-- ============================================================================
CREATE TABLE IF NOT EXISTS mla_historical_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    indicator_id INTEGER NOT NULL,
    indicator_name TEXT NOT NULL,
    indicator_code TEXT NOT NULL,
    calendar_date DATE NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit TEXT DEFAULT 'c/kg cwt',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (indicator_id, calendar_date)
);

ALTER TABLE mla_historical_indicators ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mla_historical_indicators' AND policyname = 'allow_public_read_mla_historical') THEN
        CREATE POLICY allow_public_read_mla_historical ON mla_historical_indicators FOR SELECT USING (true);
    END IF;
END $$;

-- ============================================================================
-- MLA PHYSICAL REPORTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS mla_physical_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saleyard_name TEXT NOT NULL,
    sale_date DATE NOT NULL,
    category TEXT NOT NULL,
    sale_prefix TEXT,
    head_count INTEGER,
    weight_range TEXT,
    avg_price_cents_per_kg DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (saleyard_name, sale_date, category, sale_prefix, weight_range)
);

ALTER TABLE mla_physical_reports ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mla_physical_reports' AND policyname = 'allow_public_read_mla_physical') THEN
        CREATE POLICY allow_public_read_mla_physical ON mla_physical_reports FOR SELECT USING (true);
    END IF;
END $$;

-- ============================================================================
-- MLA SALEYARD REPORTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS mla_saleyard_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saleyard_name TEXT NOT NULL,
    state TEXT,
    report_date DATE NOT NULL,
    yardings INTEGER,
    summary TEXT,
    categories JSONB,
    fetched_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    UNIQUE (saleyard_name, report_date)
);

ALTER TABLE mla_saleyard_reports ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mla_saleyard_reports' AND policyname = 'allow_public_read_mla_saleyard_reports') THEN
        CREATE POLICY allow_public_read_mla_saleyard_reports ON mla_saleyard_reports FOR SELECT USING (true);
    END IF;
END $$;

-- ============================================================================
-- SMART MAPPING RULES
-- ============================================================================
CREATE TABLE IF NOT EXISTS smart_mapping_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name TEXT NOT NULL,
    conditions JSONB NOT NULL,
    target_category TEXT NOT NULL,
    target_mla_category TEXT,
    priority INTEGER DEFAULT 100,
    active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE smart_mapping_rules ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'smart_mapping_rules' AND policyname = 'allow_public_read_smart_mapping') THEN
        CREATE POLICY allow_public_read_smart_mapping ON smart_mapping_rules FOR SELECT USING (true);
    END IF;
END $$;

-- ============================================================================
-- BRANGUS CONFIG
-- ============================================================================
CREATE TABLE IF NOT EXISTS brangus_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE brangus_config ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brangus_config' AND policyname = 'allow_public_read_brangus_config') THEN
        CREATE POLICY allow_public_read_brangus_config ON brangus_config FOR SELECT USING (true);
    END IF;
END $$;

-- ============================================================================
-- BRANGUS CONVERSATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS brangus_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    title TEXT,
    model TEXT,
    total_tokens INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ
);

ALTER TABLE brangus_conversations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brangus_conversations' AND policyname = 'users_own_conversations_select') THEN
        CREATE POLICY users_own_conversations_select ON brangus_conversations FOR SELECT USING (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brangus_conversations' AND policyname = 'users_own_conversations_insert') THEN
        CREATE POLICY users_own_conversations_insert ON brangus_conversations FOR INSERT WITH CHECK (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brangus_conversations' AND policyname = 'users_own_conversations_update') THEN
        CREATE POLICY users_own_conversations_update ON brangus_conversations FOR UPDATE USING (user_id = auth.uid());
    END IF;
END $$;

-- ============================================================================
-- BRANGUS MESSAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS brangus_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES brangus_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    tool_calls JSONB,
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE brangus_messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brangus_messages' AND policyname = 'users_own_messages_select') THEN
        CREATE POLICY users_own_messages_select ON brangus_messages FOR SELECT USING (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brangus_messages' AND policyname = 'users_own_messages_insert') THEN
        CREATE POLICY users_own_messages_insert ON brangus_messages FOR INSERT WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

-- ============================================================================
-- WAITLIST
-- ============================================================================
CREATE TABLE IF NOT EXISTS waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    name TEXT,
    role TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'waitlist' AND policyname = 'allow_public_insert_waitlist') THEN
        CREATE POLICY allow_public_insert_waitlist ON waitlist FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'waitlist' AND policyname = 'allow_public_read_waitlist') THEN
        CREATE POLICY allow_public_read_waitlist ON waitlist FOR SELECT USING (true);
    END IF;
END $$;

-- ============================================================================
-- DEV UPDATES (changelog)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dev_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL,
    date DATE NOT NULL,
    build_label TEXT,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    detail TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    is_user_facing BOOLEAN DEFAULT false,
    CONSTRAINT dev_updates_platform_check CHECK (platform IN ('ios', 'web', 'supabase'))
);

ALTER TABLE dev_updates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dev_updates' AND policyname = 'allow_public_read_dev_updates') THEN
        CREATE POLICY allow_public_read_dev_updates ON dev_updates FOR SELECT USING (true);
    END IF;
END $$;

-- ============================================================================
-- ADVISOR LENSES
-- ============================================================================
CREATE TABLE IF NOT EXISTS advisor_lenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_connection_id UUID,
    active_scenario_id UUID,
    advisor_notes TEXT,
    adwg_override DOUBLE PRECISION,
    breed_premium_override DOUBLE PRECISION,
    calving_rate_override DOUBLE PRECISION,
    mortality_rate_override DOUBLE PRECISION,
    head_count_adjustment INTEGER,
    shading_percentage DOUBLE PRECISION,
    cached_baseline_value DOUBLE PRECISION,
    cached_advisor_value DOUBLE PRECISION,
    cached_shaded_value DOUBLE PRECISION,
    last_calculated_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE advisor_lenses ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ADVISOR SCENARIOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS advisor_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_connection_id UUID,
    name TEXT,
    scenario_type TEXT,
    notes TEXT,
    adwg_override DOUBLE PRECISION,
    breed_premium_override DOUBLE PRECISION,
    calving_rate_override DOUBLE PRECISION,
    mortality_rate_override DOUBLE PRECISION,
    head_count_adjustment INTEGER,
    shading_percentage DOUBLE PRECISION,
    cached_advisor_value DOUBLE PRECISION,
    cached_shaded_value DOUBLE PRECISION,
    is_locked BOOLEAN DEFAULT false,
    locked_by_name TEXT,
    locked_date TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE advisor_scenarios ENABLE ROW LEVEL SECURITY;

-- CONSIGNMENTS: created in grid_iq_redesign migration, not needed here
