-- ============================================================================
-- HERDS TABLE: Category mapping columns
-- ============================================================================
-- Adds new columns for the weight-first category mapping system and drops
-- the unused market_category column.
--
-- category: now stores master category (Steer, Heifer, Breeder, Dry Cow, Bull)
-- sub_category: weight-derived (Weaner, Yearling, Grown) or user-selected for Breeder
-- breeder_sub_type: Cow or Heifer (only for Breeder master category)
-- validation_status: ok, warning_acknowledged, error_overridden (data quality audit)
-- ============================================================================

-- New columns
ALTER TABLE herds ADD COLUMN IF NOT EXISTS sub_category TEXT DEFAULT NULL;
ALTER TABLE herds ADD COLUMN IF NOT EXISTS breeder_sub_type TEXT DEFAULT NULL;
ALTER TABLE herds ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT NULL;

-- Drop unused column (was always null)
ALTER TABLE herds DROP COLUMN IF EXISTS market_category;

-- Migrate existing category values to master categories (clean slate - safe to run)
UPDATE herds SET category = 'Steer' WHERE category IN ('Weaner Steer','Yearling Steer','Feeder Steer','Grown Steer');
UPDATE herds SET category = 'Heifer' WHERE category IN ('Weaner Heifer','Yearling Heifer','Feeder Heifer','Grown Heifer (Un-Joined)');
UPDATE herds SET category = 'Breeder', breeder_sub_type = 'Cow' WHERE category IN ('Breeder Cow','Wet Cow');
UPDATE herds SET category = 'Breeder', breeder_sub_type = 'Heifer' WHERE category = 'Breeder Heifer';
UPDATE herds SET category = 'Dry Cow' WHERE category = 'Cull Cow';
UPDATE herds SET category = 'Bull' WHERE category IN ('Weaner Bull','Yearling Bull','Grown Bull','Cull Bull');
