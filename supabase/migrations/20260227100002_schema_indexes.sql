-- ============================================================================
-- 002: Missing Composite Indexes
-- Phase 1b: Performance indexes. All wrapped in DO blocks to skip gracefully
-- when columns don't exist (fresh DB vs production DB differences).
-- ============================================================================

DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_category_prices_species_state
        ON category_prices(species, state, category, data_date DESC);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_historical_indicators_freshness
        ON mla_historical_indicators(indicator_id, updated_at DESC);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_physical_reports_lookup
        ON mla_physical_reports(saleyard_name, report_date DESC);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_national_indicators_expiry
        ON mla_national_indicators(expires_at);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_historical_market_prices_lookup
        ON historical_market_prices(category, saleyard, state);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;
