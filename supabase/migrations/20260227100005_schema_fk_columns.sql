-- ============================================================================
-- 005: Foreign Key Columns on Existing Tables
-- Phase 3: Adds nullable FK ID columns alongside existing text columns.
-- The app continues querying by text. These columns are for future use
-- and data integrity validation.
-- REQUIRES: 004-reference-tables.sql must have been run first.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Add FK columns to category_prices
-- All nullable so existing inserts (from Edge Function, CSV import) still work.
-- --------------------------------------------------------------------------
DO $$
BEGIN
    -- species_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'category_prices' AND column_name = 'species_id'
    ) THEN
        ALTER TABLE category_prices
            ADD COLUMN species_id SMALLINT REFERENCES ref_species(id);
    END IF;

    -- saleyard_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'category_prices' AND column_name = 'saleyard_id'
    ) THEN
        ALTER TABLE category_prices
            ADD COLUMN saleyard_id SMALLINT REFERENCES ref_saleyards(id);
    END IF;

    -- breed_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'category_prices' AND column_name = 'breed_id'
    ) THEN
        ALTER TABLE category_prices
            ADD COLUMN breed_id SMALLINT REFERENCES ref_breeds(id);
    END IF;

    -- category_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'category_prices' AND column_name = 'category_id'
    ) THEN
        ALTER TABLE category_prices
            ADD COLUMN category_id SMALLINT REFERENCES ref_categories(id);
    END IF;
END $$;

-- --------------------------------------------------------------------------
-- 2. Add FK columns to breed_premiums
-- --------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'breed_premiums' AND column_name = 'species_id'
    ) THEN
        ALTER TABLE breed_premiums
            ADD COLUMN species_id SMALLINT REFERENCES ref_species(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'breed_premiums' AND column_name = 'breed_id'
    ) THEN
        ALTER TABLE breed_premiums
            ADD COLUMN breed_id SMALLINT REFERENCES ref_breeds(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'breed_premiums' AND column_name = 'category_id'
    ) THEN
        ALTER TABLE breed_premiums
            ADD COLUMN category_id SMALLINT REFERENCES ref_categories(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'breed_premiums' AND column_name = 'saleyard_id'
    ) THEN
        ALTER TABLE breed_premiums
            ADD COLUMN saleyard_id SMALLINT REFERENCES ref_saleyards(id);
    END IF;
END $$;

-- --------------------------------------------------------------------------
-- 3. Backfill FK columns from text values (skip gracefully on fresh DB)
-- --------------------------------------------------------------------------
DO $$ BEGIN
    -- category_prices backfill
    UPDATE category_prices cp SET species_id = rs.id FROM ref_species rs WHERE cp.species = rs.name AND cp.species_id IS NULL;
    UPDATE category_prices cp SET saleyard_id = rs.id FROM ref_saleyards rs WHERE cp.saleyard = rs.name AND cp.saleyard_id IS NULL;
    UPDATE category_prices cp SET breed_id = rb.id FROM ref_breeds rb JOIN ref_species rs ON rb.species_id = rs.id WHERE cp.breed = rb.name AND cp.species = rs.name AND cp.breed_id IS NULL AND cp.breed IS NOT NULL;
    UPDATE category_prices cp SET category_id = rc.id FROM ref_categories rc JOIN ref_species rs ON rc.species_id = rs.id WHERE cp.category = rc.name AND cp.species = rs.name AND cp.category_id IS NULL;
    -- breed_premiums backfill
    UPDATE breed_premiums bp SET species_id = rs.id FROM ref_species rs WHERE bp.species = rs.name AND bp.species_id IS NULL;
    UPDATE breed_premiums bp SET breed_id = rb.id FROM ref_breeds rb JOIN ref_species rs ON rb.species_id = rs.id WHERE bp.breed = rb.name AND bp.species = rs.name AND bp.breed_id IS NULL;
    UPDATE breed_premiums bp SET category_id = rc.id FROM ref_categories rc JOIN ref_species rs ON rc.species_id = rs.id WHERE bp.category = rc.name AND bp.species = rs.name AND bp.category_id IS NULL;
    UPDATE breed_premiums bp SET saleyard_id = rs.id FROM ref_saleyards rs WHERE bp.saleyard = rs.name AND bp.saleyard_id IS NULL AND bp.saleyard IS NOT NULL;
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

-- --------------------------------------------------------------------------
-- 5. Indexes on new FK columns
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_category_prices_species_id ON category_prices(species_id);
CREATE INDEX IF NOT EXISTS idx_category_prices_saleyard_id ON category_prices(saleyard_id);
CREATE INDEX IF NOT EXISTS idx_category_prices_breed_id ON category_prices(breed_id);
CREATE INDEX IF NOT EXISTS idx_category_prices_category_id ON category_prices(category_id);

CREATE INDEX IF NOT EXISTS idx_breed_premiums_species_id ON breed_premiums(species_id);
CREATE INDEX IF NOT EXISTS idx_breed_premiums_breed_id ON breed_premiums(breed_id);
CREATE INDEX IF NOT EXISTS idx_breed_premiums_category_id ON breed_premiums(category_id);
CREATE INDEX IF NOT EXISTS idx_breed_premiums_saleyard_id ON breed_premiums(saleyard_id);

-- --------------------------------------------------------------------------
-- 6. Verification: Check backfill completeness
-- Run these after applying to see if any rows have NULL FKs that should have values.
-- --------------------------------------------------------------------------

-- category_prices: rows where species text exists but FK is NULL (should be 0)
-- SELECT COUNT(*) FROM category_prices WHERE species IS NOT NULL AND species_id IS NULL;

-- category_prices: rows where saleyard text exists but FK is NULL
-- (May be > 0 if saleyard names don't match ref_saleyards exactly)
-- SELECT DISTINCT saleyard FROM category_prices WHERE saleyard IS NOT NULL AND saleyard_id IS NULL;

-- category_prices: rows where breed text exists but FK is NULL
-- SELECT DISTINCT breed, species FROM category_prices WHERE breed IS NOT NULL AND breed_id IS NULL;

-- category_prices: rows where category text exists but FK is NULL
-- SELECT DISTINCT category, species FROM category_prices WHERE category IS NOT NULL AND category_id IS NULL;

-- breed_premiums: same checks
-- SELECT COUNT(*) FROM breed_premiums WHERE species IS NOT NULL AND species_id IS NULL;
-- SELECT DISTINCT breed, species FROM breed_premiums WHERE breed IS NOT NULL AND breed_id IS NULL;
