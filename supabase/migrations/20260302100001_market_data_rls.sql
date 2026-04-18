-- Migration: Enable RLS on market data tables
-- These tables were missing explicit RLS policies, meaning any authenticated user
-- had full read/write access. Market data is public read, write only via Edge Functions.
-- Date: 2 Mar 2026

-- category_prices
ALTER TABLE category_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read category_prices"
    ON category_prices FOR SELECT
    USING (true);

-- breed_premiums
ALTER TABLE breed_premiums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read breed_premiums"
    ON breed_premiums FOR SELECT
    USING (true);

-- mla_national_indicators
ALTER TABLE mla_national_indicators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read mla_national_indicators"
    ON mla_national_indicators FOR SELECT
    USING (true);

-- mla_historical_indicators
ALTER TABLE mla_historical_indicators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read mla_historical_indicators"
    ON mla_historical_indicators FOR SELECT
    USING (true);

-- mla_physical_reports
ALTER TABLE mla_physical_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read mla_physical_reports"
    ON mla_physical_reports FOR SELECT
    USING (true);

-- Note: Edge Functions use the service_role key which bypasses RLS,
-- so write access for the mla-scraper continues to work unchanged.
