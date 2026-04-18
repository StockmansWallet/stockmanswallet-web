-- ============================================================================
-- GRID IQ REDESIGN - Phase 0 Schema Changes
-- ============================================================================
-- Adds consignment model, Kill Score/GCR/Grid Risk metrics, and analysis mode.
-- All new columns have defaults for backward compatibility with existing data
-- and SwiftData lightweight migration.
-- ============================================================================


-- ============================================================================
-- 1. CONSIGNMENTS
-- A processor booking/delivery linking one grid to one or more herd groups.
-- Status lifecycle: draft -> confirmed -> completed
-- ============================================================================
CREATE TABLE consignments (
    id                          UUID PRIMARY KEY,
    user_id                     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    processor_name              TEXT NOT NULL,
    plant_location              TEXT,
    booking_reference           TEXT,
    kill_date                   TIMESTAMPTZ,
    status                      TEXT NOT NULL DEFAULT 'draft',

    -- Totals (populated when confirmed)
    total_head_count            INTEGER,
    total_gross_value           DOUBLE PRECISION,
    total_net_value             DOUBLE PRECISION,

    -- Links
    processor_grid_id           UUID REFERENCES processor_grids(id),
    kill_sheet_record_id        UUID REFERENCES kill_sheet_records(id),

    notes                       TEXT,

    -- Sync metadata
    is_deleted                  BOOLEAN NOT NULL DEFAULT false,
    deleted_at                  TIMESTAMPTZ,
    last_synced_at              TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE consignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_consignments_select" ON consignments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "users_own_consignments_insert" ON consignments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_consignments_update" ON consignments FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON consignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_consignments_user_id ON consignments (user_id);
CREATE INDEX idx_consignments_updated_at ON consignments (user_id, updated_at);
CREATE INDEX idx_consignments_status ON consignments (user_id, status);


-- ============================================================================
-- 2. CONSIGNMENT ALLOCATIONS
-- Links a consignment to one or more herd groups with head counts.
-- Example: 40 steers from herd A + 15 steers from herd B + 10 bulls from herd C
-- ============================================================================
CREATE TABLE consignment_allocations (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consignment_id              UUID NOT NULL REFERENCES consignments(id) ON DELETE CASCADE,
    herd_id               UUID NOT NULL REFERENCES herds(id),

    head_count                  INTEGER NOT NULL,
    category                    TEXT,
    average_weight              DOUBLE PRECISION,
    total_value                 DOUBLE PRECISION,

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE consignment_allocations ENABLE ROW LEVEL SECURITY;
-- RLS via parent consignment ownership
CREATE POLICY "users_own_consignment_allocations_select" ON consignment_allocations
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM consignments c WHERE c.id = consignment_id AND c.user_id = auth.uid())
    );
CREATE POLICY "users_own_consignment_allocations_insert" ON consignment_allocations
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM consignments c WHERE c.id = consignment_id AND c.user_id = auth.uid())
    );
CREATE POLICY "users_own_consignment_allocations_update" ON consignment_allocations
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM consignments c WHERE c.id = consignment_id AND c.user_id = auth.uid())
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM consignments c WHERE c.id = consignment_id AND c.user_id = auth.uid())
    );

CREATE TRIGGER set_updated_at BEFORE UPDATE ON consignment_allocations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_consignment_allocations_consignment_id ON consignment_allocations (consignment_id);
CREATE INDEX idx_consignment_allocations_herd_id ON consignment_allocations (herd_id);


-- ============================================================================
-- 3. ADD CONSIGNMENT FK TO EXISTING TABLES
-- ============================================================================

-- Link sales records to consignment (processor sales only, saleyard sales remain standalone)
ALTER TABLE sales_records ADD COLUMN consignment_id UUID REFERENCES consignments(id);
CREATE INDEX idx_sales_records_consignment_id ON sales_records (consignment_id) WHERE consignment_id IS NOT NULL;

-- Link kill sheets to consignment
ALTER TABLE kill_sheet_records ADD COLUMN consignment_id UUID REFERENCES consignments(id);
CREATE INDEX idx_kill_sheet_records_consignment_id ON kill_sheet_records (consignment_id) WHERE consignment_id IS NOT NULL;


-- ============================================================================
-- 4. ADD KILL SCORE / GCR / GRID RISK COLUMNS TO GRID IQ ANALYSES
-- ============================================================================

-- Analysis mode: pre_sale (decision support) or post_sale (audit)
ALTER TABLE grid_iq_analyses ADD COLUMN analysis_mode TEXT NOT NULL DEFAULT 'pre_sale';

-- Grid Capture Ratio: actual revenue / maximum possible grid revenue
ALTER TABLE grid_iq_analyses ADD COLUMN gcr DOUBLE PRECISION;

-- Grid Risk: 1 - GCR (proportion of value typically lost)
ALTER TABLE grid_iq_analyses ADD COLUMN grid_risk DOUBLE PRECISION;

-- Kill Score: composite 0-100 scorecard
ALTER TABLE grid_iq_analyses ADD COLUMN kill_score DOUBLE PRECISION;

-- Kill Score component scores (each 0-100)
ALTER TABLE grid_iq_analyses ADD COLUMN grid_compliance_score DOUBLE PRECISION;
ALTER TABLE grid_iq_analyses ADD COLUMN fat_compliance_score DOUBLE PRECISION;
ALTER TABLE grid_iq_analyses ADD COLUMN dentition_compliance_score DOUBLE PRECISION;

-- Link analysis to consignment (optional)
ALTER TABLE grid_iq_analyses ADD COLUMN consignment_id UUID REFERENCES consignments(id);
CREATE INDEX idx_grid_iq_analyses_consignment_id ON grid_iq_analyses (consignment_id) WHERE consignment_id IS NOT NULL;
