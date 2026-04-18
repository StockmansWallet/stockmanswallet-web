-- ============================================================================
-- 003: CHECK Constraints
-- Data integrity constraints. All wrapped in exception handlers to skip
-- gracefully when columns don't exist (fresh DB vs production differences).
-- ============================================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_category_prices_species') THEN
        ALTER TABLE category_prices ADD CONSTRAINT chk_category_prices_species CHECK (species IN ('Cattle', 'Sheep', 'Pigs', 'Goats'));
    END IF;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_breed_premiums_species') THEN
        ALTER TABLE breed_premiums ADD CONSTRAINT chk_breed_premiums_species CHECK (species IN ('Cattle', 'Sheep', 'Pigs', 'Goats'));
    END IF;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_premium_range') THEN
        ALTER TABLE breed_premiums ADD CONSTRAINT chk_premium_range CHECK (premium_pct BETWEEN -50 AND 100);
    END IF;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_confidence_range') THEN
        ALTER TABLE breed_premiums ADD CONSTRAINT chk_confidence_range CHECK (confidence_score BETWEEN 0 AND 1);
    END IF;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_valid_role') THEN
        ALTER TABLE user_profiles ADD CONSTRAINT chk_valid_role CHECK (role IN ('farmer_grazier', 'agribusiness_banker', 'insurer', 'livestock_agent', 'accountant', 'succession_planner'));
    END IF;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_price_source') THEN
        ALTER TABLE category_prices ADD CONSTRAINT chk_price_source CHECK (source IN ('MLA Physical Report', 'MLA API', 'MLA API + Smart Mapping', 'MLA API + Smart Mapping + Breed Premium', 'Calculated', 'Manual', 'CSV Import'));
    END IF;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_positive_base_price') THEN
        ALTER TABLE category_prices ADD CONSTRAINT chk_positive_base_price CHECK (base_price_per_kg > 0);
    END IF;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_positive_final_price') THEN
        ALTER TABLE category_prices ADD CONSTRAINT chk_positive_final_price CHECK (final_price_per_kg > 0);
    END IF;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;
