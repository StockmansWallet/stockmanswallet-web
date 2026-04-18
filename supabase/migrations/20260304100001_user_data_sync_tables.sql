-- ============================================================================
-- 006: User Data Sync Tables (with drop-and-recreate for clean deployment)
-- Creates 11 tables for bidirectional SwiftData <-> Supabase sync.
--
-- Note: Uses DROP TABLE CASCADE to clean up any partially-created tables
-- from a previous migration attempt. These tables are brand new and empty.
-- ============================================================================

-- Drop in reverse dependency order (children before parents)
DROP TABLE IF EXISTS custom_sale_locations CASCADE;
DROP TABLE IF EXISTS grid_iq_analyses CASCADE;
DROP TABLE IF EXISTS processor_grids CASCADE;
DROP TABLE IF EXISTS saved_freight_estimates CASCADE;
DROP TABLE IF EXISTS kill_sheet_records CASCADE;
DROP TABLE IF EXISTS yard_book_items CASCADE;
DROP TABLE IF EXISTS sales_records CASCADE;
DROP TABLE IF EXISTS health_records CASCADE;
DROP TABLE IF EXISTS muster_records CASCADE;
DROP TABLE IF EXISTS herds CASCADE;
DROP TABLE IF EXISTS properties CASCADE;


-- ============================================================================
-- 1. PROPERTIES
-- ============================================================================
CREATE TABLE properties (
    id                          UUID PRIMARY KEY,
    user_id                     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    property_name               TEXT NOT NULL,
    property_pic                TEXT,
    is_default                  BOOLEAN NOT NULL DEFAULT false,
    is_simulated                BOOLEAN NOT NULL DEFAULT false,

    -- Location
    state                       TEXT NOT NULL DEFAULT 'QLD',
    region                      TEXT,
    address                     TEXT,
    suburb                      TEXT,
    postcode                    TEXT,
    latitude                    DOUBLE PRECISION,
    longitude                   DOUBLE PRECISION,

    -- Property details
    acreage                     DOUBLE PRECISION,
    property_type               TEXT,
    notes                       TEXT,

    -- Market and logistics
    default_saleyard            TEXT,
    default_saleyard_distance   DOUBLE PRECISION,

    -- Valuation settings
    mortality_rate              DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    calving_rate                DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    freight_cost_per_km         DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    -- Sync metadata
    is_deleted                  BOOLEAN NOT NULL DEFAULT false,
    deleted_at                  TIMESTAMPTZ,
    last_synced_at              TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_properties_select" ON properties FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "users_own_properties_insert" ON properties FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_properties_update" ON properties FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_properties_user_id ON properties (user_id);
CREATE INDEX idx_properties_updated_at ON properties (user_id, updated_at);


-- ============================================================================
-- 2. HERD GROUPS
-- ============================================================================
CREATE TABLE herds (
    id                          UUID PRIMARY KEY,
    user_id                     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Identity
    name                        TEXT NOT NULL,
    animal_id_number            TEXT,

    -- Biological attributes
    species                     TEXT NOT NULL,
    breed                       TEXT NOT NULL,
    sex                         TEXT NOT NULL,
    category                    TEXT NOT NULL,
    age_months                  INTEGER NOT NULL DEFAULT 0,

    -- Physical attributes
    head_count                  INTEGER NOT NULL DEFAULT 0,
    initial_weight              DOUBLE PRECISION NOT NULL DEFAULT 0,
    current_weight              DOUBLE PRECISION NOT NULL DEFAULT 0,
    daily_weight_gain           DOUBLE PRECISION NOT NULL DEFAULT 0,
    dwg_change_date             TIMESTAMPTZ,
    previous_dwg                DOUBLE PRECISION,
    use_creation_date_for_weight BOOLEAN NOT NULL DEFAULT false,

    -- Breeding status
    is_breeder                  BOOLEAN NOT NULL DEFAULT false,
    is_pregnant                 BOOLEAN NOT NULL DEFAULT false,
    joined_date                 TIMESTAMPTZ,
    calving_rate                DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    lactation_status            TEXT,
    calving_processed_date      TIMESTAMPTZ,

    -- Breeding program
    breeding_program_type       TEXT,
    joining_period_start        TIMESTAMPTZ,
    joining_period_end          TIMESTAMPTZ,

    -- Market mapping
    selected_saleyard           TEXT,
    market_category             TEXT,

    -- Status
    is_sold                     BOOLEAN NOT NULL DEFAULT false,
    sold_date                   TIMESTAMPTZ,
    sold_price                  DOUBLE PRECISION,

    -- Location
    paddock_name                TEXT,
    location_latitude           DOUBLE PRECISION,
    location_longitude          DOUBLE PRECISION,
    property_id                 UUID,

    -- Overrides and notes
    breed_premium_override      DOUBLE PRECISION,
    additional_info             TEXT,
    notes                       TEXT,
    mortality_rate              DOUBLE PRECISION,
    calf_weight_recorded_date   TIMESTAMPTZ,

    -- Demo data
    is_demo_data                BOOLEAN NOT NULL DEFAULT false,

    -- Sync metadata
    is_deleted                  BOOLEAN NOT NULL DEFAULT false,
    deleted_at                  TIMESTAMPTZ,
    last_synced_at              TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE herds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_herds_select" ON herds FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "users_own_herds_insert" ON herds FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_herds_update" ON herds FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON herds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_herds_user_id ON herds (user_id);
CREATE INDEX idx_herds_updated_at ON herds (user_id, updated_at);
CREATE INDEX idx_herds_property_id ON herds (user_id, property_id);


-- ============================================================================
-- 3. MUSTER RECORDS
-- ============================================================================
CREATE TABLE muster_records (
    id                          UUID PRIMARY KEY,
    user_id                     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    herd_id               UUID,

    date                        TIMESTAMPTZ NOT NULL,
    notes                       TEXT,
    total_head_count            INTEGER,
    cattle_yard                 TEXT,
    weaners_count               INTEGER,
    branders_count              INTEGER,

    -- Demo data
    is_demo_data                BOOLEAN NOT NULL DEFAULT false,

    -- Sync metadata
    linked_yard_book_item_id    UUID,
    is_deleted                  BOOLEAN NOT NULL DEFAULT false,
    deleted_at                  TIMESTAMPTZ,
    last_synced_at              TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE muster_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_muster_records_select" ON muster_records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "users_own_muster_records_insert" ON muster_records FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_muster_records_update" ON muster_records FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON muster_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_muster_records_user_id ON muster_records (user_id);
CREATE INDEX idx_muster_records_herd_id ON muster_records (user_id, herd_id);
CREATE INDEX idx_muster_records_updated_at ON muster_records (user_id, updated_at);


-- ============================================================================
-- 4. HEALTH RECORDS
-- ============================================================================
CREATE TABLE health_records (
    id                          UUID PRIMARY KEY,
    user_id                     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    herd_id               UUID,

    date                        TIMESTAMPTZ NOT NULL,
    treatment_type_raw          TEXT NOT NULL,
    notes                       TEXT,

    -- Demo data
    is_demo_data                BOOLEAN NOT NULL DEFAULT false,

    -- Sync metadata
    linked_yard_book_item_id    UUID,
    is_deleted                  BOOLEAN NOT NULL DEFAULT false,
    deleted_at                  TIMESTAMPTZ,
    last_synced_at              TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_health_records_select" ON health_records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "users_own_health_records_insert" ON health_records FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_health_records_update" ON health_records FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON health_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_health_records_user_id ON health_records (user_id);
CREATE INDEX idx_health_records_herd_id ON health_records (user_id, herd_id);
CREATE INDEX idx_health_records_updated_at ON health_records (user_id, updated_at);


-- ============================================================================
-- 5. SALES RECORDS
-- ============================================================================
CREATE TABLE sales_records (
    id                          UUID PRIMARY KEY,
    user_id                     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    herd_id               UUID NOT NULL,

    sale_date                   TIMESTAMPTZ NOT NULL,
    head_count                  INTEGER NOT NULL DEFAULT 0,
    average_weight              DOUBLE PRECISION NOT NULL DEFAULT 0,
    price_per_kg                DOUBLE PRECISION NOT NULL DEFAULT 0,
    price_per_head              DOUBLE PRECISION,
    pricing_type                TEXT NOT NULL DEFAULT 'per_kg',
    sale_type                   TEXT,
    sale_location               TEXT,
    total_gross_value           DOUBLE PRECISION NOT NULL DEFAULT 0,
    freight_cost                DOUBLE PRECISION NOT NULL DEFAULT 0,
    freight_distance            DOUBLE PRECISION NOT NULL DEFAULT 0,
    net_value                   DOUBLE PRECISION NOT NULL DEFAULT 0,
    notes                       TEXT,
    pdf_path                    TEXT,

    -- Demo data
    is_demo_data                BOOLEAN NOT NULL DEFAULT false,

    -- Sync metadata
    is_deleted                  BOOLEAN NOT NULL DEFAULT false,
    deleted_at                  TIMESTAMPTZ,
    last_synced_at              TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sales_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_sales_records_select" ON sales_records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "users_own_sales_records_insert" ON sales_records FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_sales_records_update" ON sales_records FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON sales_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_sales_records_user_id ON sales_records (user_id);
CREATE INDEX idx_sales_records_herd_id ON sales_records (user_id, herd_id);
CREATE INDEX idx_sales_records_updated_at ON sales_records (user_id, updated_at);


-- ============================================================================
-- 6. YARD BOOK ITEMS
-- ============================================================================
CREATE TABLE yard_book_items (
    id                          UUID PRIMARY KEY,
    user_id                     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    title                       TEXT NOT NULL,
    notes                       TEXT,
    event_date                  TIMESTAMPTZ NOT NULL,
    is_all_day                  BOOLEAN NOT NULL DEFAULT true,
    event_time                  TIMESTAMPTZ,

    -- Category
    category_raw                TEXT NOT NULL,

    -- Status
    is_completed                BOOLEAN NOT NULL DEFAULT false,
    completed_date              TIMESTAMPTZ,

    -- Recurrence
    is_recurring                BOOLEAN NOT NULL DEFAULT false,
    recurrence_rule_raw         TEXT,
    recurrence_interval         INTEGER,

    -- Reminders
    reminder_offsets            INTEGER[],
    notifications_scheduled     BOOLEAN NOT NULL DEFAULT false,

    -- Linking
    linked_herd_ids             UUID[],
    property_id                 UUID,
    pack_id                     TEXT,
    pack_item_index             INTEGER,

    -- Demo data
    is_demo_data                BOOLEAN NOT NULL DEFAULT false,

    -- Sync tracking
    linked_muster_record_id     UUID,
    linked_health_record_id     UUID,

    -- Sync metadata
    is_deleted                  BOOLEAN NOT NULL DEFAULT false,
    deleted_at                  TIMESTAMPTZ,
    last_synced_at              TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE yard_book_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_yard_book_items_select" ON yard_book_items FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "users_own_yard_book_items_insert" ON yard_book_items FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_yard_book_items_update" ON yard_book_items FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON yard_book_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_yard_book_items_user_id ON yard_book_items (user_id);
CREATE INDEX idx_yard_book_items_event_date ON yard_book_items (user_id, event_date);
CREATE INDEX idx_yard_book_items_updated_at ON yard_book_items (user_id, updated_at);


-- ============================================================================
-- 7. KILL SHEET RECORDS
-- ============================================================================
CREATE TABLE kill_sheet_records (
    id                          UUID PRIMARY KEY,
    user_id                     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    processor_name              TEXT NOT NULL,
    grid_code                   TEXT,
    kill_date                   TIMESTAMPTZ NOT NULL,
    vendor_code                 TEXT,
    pic                         TEXT,
    property_name               TEXT,
    booking_reference           TEXT,
    booking_type                TEXT,
    herd_id               UUID,

    total_head_count            INTEGER NOT NULL DEFAULT 0,
    total_body_weight           DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_gross_value           DOUBLE PRECISION NOT NULL DEFAULT 0,
    average_body_weight         DOUBLE PRECISION NOT NULL DEFAULT 0,
    average_price_per_kg        DOUBLE PRECISION NOT NULL DEFAULT 0,
    average_value_per_head      DOUBLE PRECISION NOT NULL DEFAULT 0,
    condemns                    INTEGER NOT NULL DEFAULT 0,

    -- Nested Codable arrays as JSONB
    category_summaries          JSONB NOT NULL DEFAULT '[]',
    grade_distribution          JSONB NOT NULL DEFAULT '[]',
    weight_class_distribution   JSONB NOT NULL DEFAULT '[]',
    fat_class_distribution      JSONB NOT NULL DEFAULT '[]',
    line_items                  JSONB NOT NULL DEFAULT '[]',

    realisation_factor          DOUBLE PRECISION,
    payment_check_result        JSONB,
    source_file_path            TEXT,
    notes                       TEXT,

    -- Sync metadata
    is_deleted                  BOOLEAN NOT NULL DEFAULT false,
    deleted_at                  TIMESTAMPTZ,
    last_synced_at              TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE kill_sheet_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_kill_sheet_records_select" ON kill_sheet_records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "users_own_kill_sheet_records_insert" ON kill_sheet_records FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_kill_sheet_records_update" ON kill_sheet_records FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON kill_sheet_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_kill_sheet_records_user_id ON kill_sheet_records (user_id);
CREATE INDEX idx_kill_sheet_records_updated_at ON kill_sheet_records (user_id, updated_at);
CREATE INDEX idx_kill_sheet_records_herd_id ON kill_sheet_records (user_id, herd_id);


-- ============================================================================
-- 8. SAVED FREIGHT ESTIMATES
-- ============================================================================
CREATE TABLE saved_freight_estimates (
    id                          UUID PRIMARY KEY,
    user_id                     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    origin_property_name        TEXT NOT NULL,
    destination_name            TEXT NOT NULL,
    herd_name                   TEXT NOT NULL,

    category_name               TEXT NOT NULL,
    head_count                  INTEGER NOT NULL DEFAULT 0,
    average_weight_kg           DOUBLE PRECISION NOT NULL DEFAULT 0,
    heads_per_deck              INTEGER NOT NULL DEFAULT 0,
    decks_required              INTEGER NOT NULL DEFAULT 0,
    distance_km                 DOUBLE PRECISION NOT NULL DEFAULT 0,
    rate_per_deck_per_km        DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_cost                  DOUBLE PRECISION NOT NULL DEFAULT 0,
    cost_per_head               DOUBLE PRECISION NOT NULL DEFAULT 0,
    cost_per_deck               DOUBLE PRECISION NOT NULL DEFAULT 0,
    cost_per_km                 DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_gst                   DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_with_gst              DOUBLE PRECISION NOT NULL DEFAULT 0,
    has_partial_deck            BOOLEAN NOT NULL DEFAULT false,
    spare_spots_on_last_deck    INTEGER NOT NULL DEFAULT 0,
    is_custom_job               BOOLEAN NOT NULL DEFAULT false,

    category_warning            TEXT,
    efficiency_prompt           TEXT,
    breeder_auto_detect_notice  TEXT,
    assumptions_summary         TEXT NOT NULL DEFAULT '',

    saved_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Sync metadata
    is_deleted                  BOOLEAN NOT NULL DEFAULT false,
    deleted_at                  TIMESTAMPTZ,
    last_synced_at              TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE saved_freight_estimates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_saved_freight_estimates_select" ON saved_freight_estimates FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "users_own_saved_freight_estimates_insert" ON saved_freight_estimates FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_saved_freight_estimates_update" ON saved_freight_estimates FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON saved_freight_estimates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_saved_freight_estimates_user_id ON saved_freight_estimates (user_id);
CREATE INDEX idx_saved_freight_estimates_updated_at ON saved_freight_estimates (user_id, updated_at);


-- ============================================================================
-- 9. PROCESSOR GRIDS
-- ============================================================================
CREATE TABLE processor_grids (
    id                          UUID PRIMARY KEY,
    user_id                     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    processor_name              TEXT NOT NULL,
    grid_code                   TEXT,
    contact_name                TEXT,
    contact_phone               TEXT,
    contact_email               TEXT,
    grid_date                   TIMESTAMPTZ NOT NULL,
    expiry_date                 TIMESTAMPTZ,
    location                    TEXT,
    location_latitude           DOUBLE PRECISION,
    location_longitude          DOUBLE PRECISION,

    -- Nested Codable struct array as JSONB
    entries                     JSONB NOT NULL DEFAULT '[]',

    notes                       TEXT,
    source_image_path           TEXT,

    -- Sync metadata
    is_deleted                  BOOLEAN NOT NULL DEFAULT false,
    deleted_at                  TIMESTAMPTZ,
    last_synced_at              TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE processor_grids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_processor_grids_select" ON processor_grids FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "users_own_processor_grids_insert" ON processor_grids FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_processor_grids_update" ON processor_grids FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON processor_grids FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_processor_grids_user_id ON processor_grids (user_id);
CREATE INDEX idx_processor_grids_updated_at ON processor_grids (user_id, updated_at);


-- ============================================================================
-- 10. GRID IQ ANALYSES
-- ============================================================================
CREATE TABLE grid_iq_analyses (
    id                          UUID PRIMARY KEY,
    user_id                     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    herd_id               UUID NOT NULL,
    processor_grid_id           UUID NOT NULL,
    kill_sheet_record_id        UUID,
    analysis_date               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Snapshot labels
    herd_name                   TEXT NOT NULL DEFAULT '',
    processor_name              TEXT NOT NULL DEFAULT '',

    -- Core comparison values
    mla_market_value            DOUBLE PRECISION NOT NULL DEFAULT 0,
    headline_grid_value         DOUBLE PRECISION NOT NULL DEFAULT 0,
    realisation_factor          DOUBLE PRECISION NOT NULL DEFAULT 0.92,
    realistic_grid_outcome      DOUBLE PRECISION NOT NULL DEFAULT 0,

    -- Freight impact
    freight_to_saleyard         DOUBLE PRECISION NOT NULL DEFAULT 0,
    freight_to_processor        DOUBLE PRECISION NOT NULL DEFAULT 0,

    -- Net comparison
    net_saleyard_value          DOUBLE PRECISION NOT NULL DEFAULT 0,
    net_processor_value         DOUBLE PRECISION NOT NULL DEFAULT 0,
    grid_iq_advantage           DOUBLE PRECISION NOT NULL DEFAULT 0,

    -- Sell window
    sell_window_status_raw      TEXT NOT NULL DEFAULT 'ON_TARGET',
    sell_window_detail          TEXT NOT NULL DEFAULT '',
    days_to_target              INTEGER,
    projected_carcase_weight    DOUBLE PRECISION,

    -- Opportunity insight
    opportunity_value           DOUBLE PRECISION,
    opportunity_driver          TEXT,
    opportunity_detail          TEXT,

    -- Processor fit
    processor_fit_score         DOUBLE PRECISION,
    processor_fit_label_raw     TEXT,

    -- Per-head breakdown
    head_count                  INTEGER NOT NULL DEFAULT 0,
    estimated_carcase_weight    DOUBLE PRECISION NOT NULL DEFAULT 0,
    dressing_percentage         DOUBLE PRECISION NOT NULL DEFAULT 0.54,
    is_using_personalised_data  BOOLEAN NOT NULL DEFAULT false,

    -- Brangus commentary (JSON-encoded BrangusCommentary struct)
    brangus_commentary          JSONB,

    -- Sync metadata
    is_deleted                  BOOLEAN NOT NULL DEFAULT false,
    deleted_at                  TIMESTAMPTZ,
    last_synced_at              TIMESTAMPTZ,
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE grid_iq_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_grid_iq_analyses_select" ON grid_iq_analyses FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "users_own_grid_iq_analyses_insert" ON grid_iq_analyses FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_grid_iq_analyses_update" ON grid_iq_analyses FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON grid_iq_analyses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_grid_iq_analyses_user_id ON grid_iq_analyses (user_id);
CREATE INDEX idx_grid_iq_analyses_updated_at ON grid_iq_analyses (user_id, updated_at);
CREATE INDEX idx_grid_iq_analyses_herd_id ON grid_iq_analyses (user_id, herd_id);


-- ============================================================================
-- 11. CUSTOM SALE LOCATIONS
-- ============================================================================
CREATE TABLE custom_sale_locations (
    id                          UUID PRIMARY KEY,
    user_id                     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    name                        TEXT NOT NULL,
    category                    TEXT NOT NULL,
    address                     TEXT,
    contact_name                TEXT,
    contact_phone               TEXT,
    contact_email               TEXT,
    notes                       TEXT,
    is_enabled                  BOOLEAN NOT NULL DEFAULT true,
    created_date                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Sync metadata
    is_deleted                  BOOLEAN NOT NULL DEFAULT false,
    deleted_at                  TIMESTAMPTZ,
    last_synced_at              TIMESTAMPTZ,
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE custom_sale_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_custom_sale_locations_select" ON custom_sale_locations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "users_own_custom_sale_locations_insert" ON custom_sale_locations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_own_custom_sale_locations_update" ON custom_sale_locations FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON custom_sale_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_custom_sale_locations_user_id ON custom_sale_locations (user_id);
CREATE INDEX idx_custom_sale_locations_updated_at ON custom_sale_locations (user_id, updated_at);


-- ============================================================================
-- REALTIME: Enable Postgres Changes for all 11 tables
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE properties;
ALTER PUBLICATION supabase_realtime ADD TABLE herds;
ALTER PUBLICATION supabase_realtime ADD TABLE muster_records;
ALTER PUBLICATION supabase_realtime ADD TABLE health_records;
ALTER PUBLICATION supabase_realtime ADD TABLE sales_records;
ALTER PUBLICATION supabase_realtime ADD TABLE yard_book_items;
ALTER PUBLICATION supabase_realtime ADD TABLE kill_sheet_records;
ALTER PUBLICATION supabase_realtime ADD TABLE saved_freight_estimates;
ALTER PUBLICATION supabase_realtime ADD TABLE processor_grids;
ALTER PUBLICATION supabase_realtime ADD TABLE grid_iq_analyses;
ALTER PUBLICATION supabase_realtime ADD TABLE custom_sale_locations;
