-- ============================================================================
-- CATEGORY MAPPING RULES
-- ============================================================================
-- Server-configurable reference table for weight-first MLA category mapping.
-- Apps fetch these rules on launch (cached locally) and use them to resolve
-- the correct MLA saleyard category based on master category + input weight.
--
-- This replaces hardcoded mapping logic in both iOS and web apps.
-- Rules can be updated server-side without an app release.
-- Extensible to sheep/pig/goat when needed - just add rows with species filter.
-- ============================================================================

CREATE TABLE IF NOT EXISTS category_mapping_rules (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    species           TEXT NOT NULL DEFAULT 'Cattle',
    master_category   TEXT NOT NULL,
    weight_min        NUMERIC,
    weight_max        NUMERIC,
    sub_category      TEXT NOT NULL,
    mla_preferred     TEXT,
    mla_fallback      TEXT,
    lookback_weeks    INT DEFAULT 8,
    notes             TEXT,
    sort_order        INT DEFAULT 0,
    created_at        TIMESTAMPTZ DEFAULT now(),
    updated_at        TIMESTAMPTZ DEFAULT now()
);

-- Public read access (mapping rules are not user-specific)
ALTER TABLE category_mapping_rules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'category_mapping_rules'
          AND policyname = 'allow_public_read_category_mapping_rules'
    ) THEN
        CREATE POLICY "allow_public_read_category_mapping_rules"
            ON category_mapping_rules FOR SELECT USING (true);
    END IF;
END $$;

-- Updated_at trigger
CREATE TRIGGER set_updated_at_category_mapping_rules
    BEFORE UPDATE ON category_mapping_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_category_mapping_rules_lookup
    ON category_mapping_rules (species, master_category, sort_order);

-- ============================================================================
-- SEED DATA: Cattle weight-first mapping rules
-- ============================================================================
-- Source: SW Category Mapping Spec v7.1 (March 2026)
-- Validated against MLA NLRS, AuctionsPlus, NSW DPI, FutureBeef
--
-- weight_min is inclusive, weight_max is exclusive (except NULL = no upper limit)
-- For Breeder/Dry Cow/Bull: weight_min and weight_max are NULL (any weight)
-- ============================================================================

INSERT INTO category_mapping_rules
    (species, master_category, weight_min, weight_max, sub_category, mla_preferred, mla_fallback, lookback_weeks, notes, sort_order)
VALUES
    -- STEER: weight drives sub-category and MLA lookup
    ('Cattle', 'Steer', 0, 330, 'Weaner', 'Weaner Steer', 'Yearling Steer', 8,
        'MLA Vealer data thin below 150 kg. QLD stores: no Vealer, Yearling fallback always.', 1),
    ('Cattle', 'Steer', 330, 500, 'Yearling', 'Yearling Steer', 'Grown Steer', 8,
        'Core domestic trade steer and feedlot entry weight. 330 kg crossover validated by MLA, AuctionsPlus, NSW DPI.', 2),
    ('Cattle', 'Steer', 500, NULL, 'Grown', 'Grown Steer', NULL, 8,
        'Firmly Grown Steer territory. Export-weight bullocks and heavy grass-finished steers.', 3),

    -- HEIFER: weight drives sub-category and MLA lookup
    ('Cattle', 'Heifer', 0, 300, 'Weaner', 'Heifer', 'Yearling Heifer', 8,
        'Heifers typically 10-20 kg lighter than steers. QLD: Yearling fallback always.', 4),
    ('Cattle', 'Heifer', 300, 450, 'Yearling', 'Yearling Heifer', 'Grown Heifer', 8,
        'Yearling 330-400 bracket (558k head). Grown Heifer 0-540 fallback.', 5),
    ('Cattle', 'Heifer', 450, NULL, 'Grown', 'Grown Heifer', 'Grown Heifer', 8,
        'Only Grown Heifer covers 450+. Heavy unjoined or cull heifers.', 6),

    -- BREEDER: user selects Cow or Heifer sub-type. Both map to MLA Cows.
    ('Cattle', 'Breeder', NULL, NULL, 'Cow', 'Cows', 'Cows', 8,
        'Breeding/pregnant/wet cows. Single MLA category. Match to weight bracket.', 7),
    ('Cattle', 'Breeder', NULL, NULL, 'Heifer', 'Cows', 'Cows', 8,
        'Breeding heifers. Priced as Cows. May trade at a premium in practice.', 8),

    -- DRY COW: single mapping, any weight
    ('Cattle', 'Dry Cow', NULL, NULL, 'Cows', 'Cows', 'Cows', 8,
        'Dry/cull cows for processing.', 9),

    -- BULL: weight drives sub-category, but all map to single MLA Bulls category
    ('Cattle', 'Bull', 0, 330, 'Weaner', 'Grown Bull', 'Grown Bull', 8,
        'Single MLA category. Match to weight bracket (0-450, 450-600, 600+).', 10),
    ('Cattle', 'Bull', 330, 550, 'Yearling', 'Grown Bull', 'Grown Bull', 8,
        'Yearling bulls grow faster than steers.', 11),
    ('Cattle', 'Bull', 550, NULL, 'Grown', 'Grown Bull', 'Grown Bull', 8,
        'Mature herd bulls. Some Brahman/European breeds exceed 1000 kg.', 12);
