-- ============================================================================
-- 001: Triggers and Functions
-- Phase 1a + 1c: updated_at auto-trigger + price consistency trigger
-- Safe to run immediately. Idempotent (uses CREATE OR REPLACE, DROP IF EXISTS).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Reusable updated_at trigger function
-- Sets updated_at = NOW() on every UPDATE. Attach to any table with an
-- updated_at column.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------------------
-- 2. Attach updated_at trigger to all tables
-- Uses DROP IF EXISTS + CREATE to be safely re-runnable.
-- --------------------------------------------------------------------------

-- category_prices
DROP TRIGGER IF EXISTS set_updated_at ON category_prices;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON category_prices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- breed_premiums
DROP TRIGGER IF EXISTS set_updated_at ON breed_premiums;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON breed_premiums
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- smart_mapping_rules (created in reconciliation migration, may not exist yet)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'smart_mapping_rules') THEN
        DROP TRIGGER IF EXISTS set_updated_at ON smart_mapping_rules;
        CREATE TRIGGER set_updated_at BEFORE UPDATE ON smart_mapping_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- mla_historical_indicators (created in reconciliation migration, may not exist yet)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mla_historical_indicators') THEN
        DROP TRIGGER IF EXISTS set_updated_at ON mla_historical_indicators;
        CREATE TRIGGER set_updated_at BEFORE UPDATE ON mla_historical_indicators FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- user_profiles
DROP TRIGGER IF EXISTS set_updated_at ON user_profiles;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- connection_requests
DROP TRIGGER IF EXISTS set_updated_at ON connection_requests;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON connection_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------------------------------------
-- 3. Price consistency trigger
-- Automatically recalculates final_price_per_kg from base_price_per_kg and
-- breed_premium_pct on every INSERT or UPDATE to category_prices.
-- This prevents the base and final prices from drifting out of sync.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_price_consistency()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.base_price_per_kg IS NOT NULL THEN
        NEW.final_price_per_kg = NEW.base_price_per_kg
            * (1 + COALESCE(NEW.breed_premium_pct, 0) / 100.0);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_price_consistency ON category_prices;
CREATE TRIGGER enforce_price_consistency
    BEFORE INSERT OR UPDATE ON category_prices
    FOR EACH ROW EXECUTE FUNCTION enforce_price_consistency();
