-- Demo user architecture
--
-- Introduces a shared public demo account (demo@stockmanswallet.com.au) that
-- any visitor can sign into to explore the app. Writes are blocked at the RLS
-- layer; the app reads normally so the full experience works end-to-end.
--
-- Canonical demo portfolio lives in public.sample_properties + public.sample_herds
-- and is cloned into the demo user's account via seed_demo_data_tier1().
--
-- Operational note:
--   The auth.users row for demo@stockmanswallet.com.au is created out-of-band
--   via the Supabase Auth Admin API (password is rotated per environment).
--   This migration references the production demo UUID below; update it when
--   bootstrapping a new environment.

-- ==========================================================================
-- 1. Schema: extend sample_herds + create sample_properties
-- ==========================================================================

ALTER TABLE public.sample_herds DROP COLUMN IF EXISTS joined_date;
ALTER TABLE public.sample_herds DROP COLUMN IF EXISTS dwg_change_date;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='sample_herds' AND column_name='days_offset') THEN
        ALTER TABLE public.sample_herds RENAME COLUMN days_offset TO created_days_offset;
    END IF;
END $$;

ALTER TABLE public.sample_herds
    ADD COLUMN IF NOT EXISTS property_ref text,
    ADD COLUMN IF NOT EXISTS sub_category text,
    ADD COLUMN IF NOT EXISTS breeder_sub_type text,
    ADD COLUMN IF NOT EXISTS breeding_program_type text,
    ADD COLUMN IF NOT EXISTS lactation_status text,
    ADD COLUMN IF NOT EXISTS mortality_rate double precision,
    ADD COLUMN IF NOT EXISTS breed_premium_override double precision,
    ADD COLUMN IF NOT EXISTS notes text,
    ADD COLUMN IF NOT EXISTS joined_days_offset integer,
    ADD COLUMN IF NOT EXISTS dwg_change_days_offset integer,
    ADD COLUMN IF NOT EXISTS joining_period_start_days_offset integer,
    ADD COLUMN IF NOT EXISTS joining_period_end_days_offset integer,
    ADD COLUMN IF NOT EXISTS calving_processed_days_offset integer,
    ADD COLUMN IF NOT EXISTS calf_weight_recorded_days_offset integer,
    ADD COLUMN IF NOT EXISTS sold_days_offset integer,
    ADD COLUMN IF NOT EXISTS sold_price double precision,
    ADD COLUMN IF NOT EXISTS is_sold boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.sample_properties (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    property_ref text UNIQUE NOT NULL,
    property_name text NOT NULL,
    property_pic text,
    state text NOT NULL,
    region text,
    suburb text,
    postcode text,
    address text,
    latitude double precision,
    longitude double precision,
    acreage double precision,
    property_type text,
    notes text,
    is_default boolean NOT NULL DEFAULT false,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sample_properties ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies
                   WHERE tablename='sample_properties' AND policyname='sample_properties_public_read') THEN
        CREATE POLICY sample_properties_public_read ON public.sample_properties FOR SELECT USING (true);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sample_herds_property_ref ON public.sample_herds(property_ref);
CREATE INDEX IF NOT EXISTS idx_sample_herds_sort ON public.sample_herds(sort_order);

-- ==========================================================================
-- 2. Canonical demo data (2 properties, 22 herds across all categories)
-- ==========================================================================

TRUNCATE public.sample_herds;
DELETE FROM public.sample_properties;

INSERT INTO public.sample_properties (property_ref, property_name, property_pic, state, region, suburb, postcode, address, latitude, longitude, acreage, property_type, notes, is_default, sort_order) VALUES
('doongara', 'Doongara Station', 'QDAB1234', 'QLD', 'Central Queensland', 'Emerald', '4720', '1742 Capricorn Highway', -23.437, 148.158, 15000, 'Grazing', 'Breeding and growing operation. Primary saleyard: Gracemere CQLX.', true, 0),
('brangus-hills', 'Brangus Hills', 'NBAC5678', 'NSW', 'Riverina', 'Wagga Wagga', '2650', '384 Tumbarumba Road', -35.117, 147.372, 3500, 'Grazing', 'Secondary growing block. Primary saleyard: Wagga Wagga Livestock Marketing Centre.', false, 1);

INSERT INTO public.sample_herds (
    property_ref, name, species, breed, sex, category, sub_category, breeder_sub_type,
    age_months, head_count, initial_weight, current_weight, daily_weight_gain,
    is_breeder, is_pregnant, calving_rate, breeding_program_type, lactation_status,
    mortality_rate, paddock_name, selected_saleyard, notes, additional_info,
    created_days_offset, joined_days_offset, joining_period_start_days_offset, joining_period_end_days_offset,
    calving_processed_days_offset, calf_weight_recorded_days_offset,
    previous_dwg, dwg_change_days_offset,
    is_sold, sold_days_offset, sold_price, sort_order
) VALUES
-- Doongara - Breeders
('doongara', 'Main Breeders', 'Cattle', 'Droughtmaster', 'Female', 'Breeder', 'Cow', 'Cow', 48, 185, 540, 540, 0, true, true, 0.88, 'ai', NULL, 0.025, 'Home Paddock', 'Gracemere Central Queensland Livestock Exchange', 'AI program, Doongara Dozer sire line. PTIC 88%.', 'AI sire: Doongara Dozer D42. Synch program Oct.', -280, -210, -240, -180, NULL, NULL, NULL, NULL, false, NULL, NULL, 10),
('doongara', 'First-Calf Heifers', 'Cattle', 'Brangus', 'Female', 'Breeder', 'Heifer', 'Heifer', 26, 42, 420, 420, 0, true, true, 0.82, 'controlled', NULL, 0.025, 'River Paddock', 'Gracemere Central Queensland Livestock Exchange', 'First calvers, calves at foot. 34 calves dropped so far.', 'Calves at Foot: 34 head, 2 months, 80 kg', -210, -240, -270, -220, -30, -30, NULL, NULL, false, NULL, NULL, 20),
('doongara', 'Wet Cows', 'Cattle', 'Droughtmaster', 'Female', 'Breeder', 'Cow', 'Cow', 54, 60, 510, 510, 0, true, false, 0.90, NULL, 'Lactating', 0.025, 'Creek Paddock', 'Gracemere Central Queensland Livestock Exchange', 'Calves at foot, good condition. Creek paddock feed holding well.', 'Calves at Foot: 54 head, 3 months, 110 kg', -180, NULL, NULL, NULL, -60, -60, NULL, NULL, false, NULL, NULL, 30),
('doongara', 'Hereford Breeders', 'Cattle', 'Poll Hereford', 'Female', 'Breeder', 'Cow', 'Cow', 42, 90, 560, 560, 0, true, true, 0.85, 'uncontrolled', NULL, 0.025, 'South Paddock', 'Roma Saleyards', 'Natural joining, River Paddock bulls.', NULL, -320, -180, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, 40),
-- Doongara - Heifers
('doongara', 'Weaner Heifers', 'Cattle', 'Droughtmaster', 'Female', 'Heifer', 'Weaner', NULL, 7, 65, 220, 220, 0.85, false, false, NULL, NULL, NULL, 0.025, 'East Paddock', 'Gracemere Central Queensland Livestock Exchange', 'Off mothers, supplementary feed. Gaining well.', NULL, -60, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, 50),
('doongara', 'Yearling Heifers', 'Cattle', 'Santa Gertrudis', 'Female', 'Heifer', 'Yearling', NULL, 14, 50, 340, 340, 0.75, false, false, NULL, NULL, NULL, 0.025, 'North Paddock', 'Emerald Saleyards', 'Growing well on improved pasture.', NULL, -150, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, 60),
-- Doongara - Steers
('doongara', 'Weaner Steers', 'Cattle', 'Droughtmaster', 'Male', 'Steer', 'Weaner', NULL, 7, 70, 230, 230, 1.1, false, false, NULL, NULL, NULL, 0.025, 'East Paddock', 'Gracemere Central Queensland Livestock Exchange', 'Fresh off mothers, strong weaners.', NULL, -55, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, 70),
('doongara', 'Yearling Steers', 'Cattle', 'Brangus', 'Male', 'Steer', 'Yearling', NULL, 14, 55, 340, 340, 0.85, false, false, NULL, NULL, NULL, 0.025, 'Top Paddock', 'Gracemere Central Queensland Livestock Exchange', 'Good growth rates on improved pasture.', NULL, -170, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, 80),
('doongara', 'Feeder Steers', 'Cattle', 'Angus', 'Male', 'Steer', 'Yearling', NULL, 18, 40, 380, 380, 1.0, false, false, NULL, NULL, NULL, 0.025, 'Hill Paddock', 'Gracemere Central Queensland Livestock Exchange', 'Moved from native pasture to improved. DWG lifted from 0.6 to 1.0.', NULL, -220, NULL, NULL, NULL, NULL, NULL, 0.6, -45, false, NULL, NULL, 90),
('doongara', 'Wagyu Weaners', 'Cattle', 'Wagyu', 'Male', 'Steer', 'Weaner', NULL, 9, 25, 260, 260, 0.9, false, false, NULL, NULL, NULL, 0.025, 'West Paddock', 'Dalby Regional Saleyards', 'Purchased at Dalby. High-value genetics.', NULL, -50, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, 100),
('doongara', 'Droughtmaster Yearlings', 'Cattle', 'Droughtmaster', 'Male', 'Steer', 'Yearling', NULL, 15, 60, 350, 350, 0.9, false, false, NULL, NULL, NULL, 0.025, 'Bore Paddock', 'Gracemere Central Queensland Livestock Exchange', 'Good weight gain on native pasture.', NULL, -140, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, 110),
-- Doongara - Bulls
('doongara', 'Herd Bulls', 'Cattle', 'Brahman', 'Male', 'Bull', 'Grown', NULL, 48, 8, 850, 850, 0, false, false, NULL, NULL, NULL, 0.015, 'Home Paddock', 'Gracemere Central Queensland Livestock Exchange', 'Working bulls, annual BBSE completed.', NULL, -365, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, 120),
('doongara', 'Young Bulls', 'Cattle', 'Droughtmaster', 'Male', 'Bull', 'Yearling', NULL, 18, 12, 400, 400, 0.8, false, false, NULL, NULL, NULL, 0.015, 'Rocky Paddock', 'Gracemere Central Queensland Livestock Exchange', 'Bull selection draft pending.', NULL, -160, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, 130),
-- Doongara - Dry Cow
('doongara', 'Cull Cows', 'Cattle', 'Mixed Breed', 'Female', 'Dry Cow', 'Cows', NULL, 84, 22, 480, 480, 0, false, false, NULL, NULL, NULL, 0.025, 'Back Paddock', 'Gracemere Central Queensland Livestock Exchange', 'Drafted for next Gracemere sale.', NULL, -45, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, 140),
-- Doongara - Sold
('doongara', 'Grown Steers (sold)', 'Cattle', 'Charolais', 'Male', 'Steer', 'Grown', NULL, 26, 32, 520, 520, 0.5, false, false, NULL, NULL, NULL, 0.025, 'South Paddock', 'Gracemere Central Queensland Livestock Exchange', 'Sold at CQLX weekly sale.', NULL, -300, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, -240, 3.85, 150),
('doongara', 'Cull Bulls (sold)', 'Cattle', 'Mixed Breed', 'Male', 'Bull', 'Grown', NULL, 72, 5, 780, 780, 0, false, false, NULL, NULL, NULL, 0.015, 'Back Paddock', 'Gracemere Central Queensland Livestock Exchange', 'Past working age.', NULL, -120, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, -60, 2.90, 160),
('doongara', 'Brahman Feeder Heifers (sold)', 'Cattle', 'Brahman', 'Female', 'Heifer', 'Yearling', NULL, 17, 25, 370, 370, 0.6, false, false, NULL, NULL, NULL, 0.025, 'Bore Paddock', 'Gracemere Central Queensland Livestock Exchange', 'Private sale to feedlot.', NULL, -190, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, -130, 3.65, 170),
('doongara', 'Angus Yearling Steers (sold)', 'Cattle', 'Angus', 'Male', 'Steer', 'Yearling', NULL, 16, 48, 420, 420, 0.7, false, false, NULL, NULL, NULL, 0.025, 'North Paddock', 'Gracemere Central Queensland Livestock Exchange', 'Private sale, buyer collected.', NULL, -240, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, -180, 4.20, 180),
-- Brangus Hills (NSW) - multi-property showcase + bracket/breed coverage
('brangus-hills', 'Riverina Breeders', 'Cattle', 'Angus', 'Female', 'Breeder', 'Cow', 'Cow', 44, 40, 520, 520, 0, true, true, 0.87, 'uncontrolled', NULL, 0.02, 'Ridge Paddock', 'Wagga Wagga Livestock Marketing Centre', 'NSW breeding block, Angus joining.', NULL, -260, -150, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, 200),
('brangus-hills', 'Grown Steers', 'Cattle', 'Santa Gertrudis', 'Male', 'Steer', 'Grown', NULL, 30, 35, 580, 580, 0.6, false, false, NULL, NULL, NULL, 0.02, 'River Flats', 'Wagga Wagga Livestock Marketing Centre', 'Finishing on lucerne. Near market weight.', NULL, -300, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, 210),
('brangus-hills', 'Riverina Weaner Heifers', 'Cattle', 'Angus', 'Female', 'Heifer', 'Weaner', NULL, 7, 45, 210, 210, 0.9, false, false, NULL, NULL, NULL, 0.02, 'North Ridge', 'Wagga Wagga Livestock Marketing Centre', 'Weaned Feb, strong growth on improved pasture.', NULL, -70, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, 220),
('brangus-hills', 'Backgrounder Steers', 'Cattle', 'Charolais', 'Male', 'Steer', 'Yearling', NULL, 16, 50, 310, 310, 1.1, false, false, NULL, NULL, NULL, 0.02, 'Back Flats', 'Wagga Wagga Livestock Marketing Centre', 'Lifted onto oats late summer. DWG up from 0.4 to 1.1.', NULL, -180, NULL, NULL, NULL, NULL, NULL, 0.4, -40, false, NULL, NULL, 230);

-- ==========================================================================
-- 3. RPC: seed_demo_data_tier1(p_user_id) + convenience overload
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.seed_demo_data_tier1(p_user_id uuid)
RETURNS TABLE(property_count integer, herd_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now timestamptz := now();
    v_prop_count integer := 0;
    v_herd_count integer := 0;
    v_prop_id_map jsonb := '{}'::jsonb;
    v_rec record;
    v_new_prop_id uuid;
    v_new_herd_id uuid;
    v_prop_id_for_herd uuid;
    v_created_at timestamptz;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'p_user_id is required';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'User % not found', p_user_id;
    END IF;

    -- Soft-delete prior demo state for this user so re-seeds are idempotent.
    UPDATE public.herds
       SET is_deleted = true, deleted_at = v_now, updated_at = v_now
     WHERE user_id = p_user_id AND is_demo_data = true AND is_deleted = false;

    UPDATE public.properties
       SET is_deleted = true, deleted_at = v_now, updated_at = v_now
     WHERE user_id = p_user_id AND is_simulated = true AND is_deleted = false;

    -- Insert canonical properties, building property_ref -> new uuid map.
    FOR v_rec IN SELECT * FROM public.sample_properties ORDER BY sort_order LOOP
        v_new_prop_id := gen_random_uuid();

        INSERT INTO public.properties (
            id, user_id, is_simulated, is_deleted,
            property_name, property_pic, state, region, suburb, postcode, address,
            latitude, longitude, acreage, property_type, notes,
            is_default, created_at, updated_at
        ) VALUES (
            v_new_prop_id, p_user_id, true, false,
            v_rec.property_name, v_rec.property_pic, v_rec.state, v_rec.region, v_rec.suburb, v_rec.postcode, v_rec.address,
            v_rec.latitude, v_rec.longitude, v_rec.acreage, v_rec.property_type, v_rec.notes,
            v_rec.is_default, v_now, v_now
        );

        v_prop_id_map := v_prop_id_map || jsonb_build_object(v_rec.property_ref, v_new_prop_id::text);
        v_prop_count := v_prop_count + 1;
    END LOOP;

    -- Insert canonical herds. created_at uses the business offset; updated_at must
    -- be v_now so iOS delta-pull (.gte updated_at lastSync) finds the new rows.
    FOR v_rec IN SELECT * FROM public.sample_herds ORDER BY sort_order LOOP
        v_new_herd_id := gen_random_uuid();
        v_prop_id_for_herd := (v_prop_id_map ->> v_rec.property_ref)::uuid;
        v_created_at := v_now + make_interval(days => COALESCE(v_rec.created_days_offset, 0));

        IF v_prop_id_for_herd IS NULL THEN
            RAISE EXCEPTION 'Sample herd % references unknown property_ref %', v_rec.name, v_rec.property_ref;
        END IF;

        INSERT INTO public.herds (
            id, user_id, property_id, is_demo_data, is_deleted,
            name, species, breed, sex, category, sub_category, breeder_sub_type,
            age_months, head_count, initial_weight, current_weight,
            daily_weight_gain, previous_dwg, dwg_change_date,
            is_breeder, is_pregnant, calving_rate, breeding_program_type, lactation_status,
            joined_date, joining_period_start, joining_period_end,
            calving_processed_date, calf_weight_recorded_date,
            mortality_rate, breed_premium_override,
            paddock_name, selected_saleyard, notes, additional_info,
            is_sold, sold_date, sold_price,
            created_at, updated_at
        ) VALUES (
            v_new_herd_id, p_user_id, v_prop_id_for_herd, true, false,
            v_rec.name, v_rec.species, v_rec.breed, v_rec.sex, v_rec.category, v_rec.sub_category, v_rec.breeder_sub_type,
            v_rec.age_months, v_rec.head_count, v_rec.initial_weight, v_rec.current_weight,
            v_rec.daily_weight_gain, v_rec.previous_dwg,
            CASE WHEN v_rec.dwg_change_days_offset IS NOT NULL THEN v_now + make_interval(days => v_rec.dwg_change_days_offset) END,
            v_rec.is_breeder, v_rec.is_pregnant, COALESCE(v_rec.calving_rate, 0.85), v_rec.breeding_program_type, v_rec.lactation_status,
            CASE WHEN v_rec.joined_days_offset IS NOT NULL THEN v_now + make_interval(days => v_rec.joined_days_offset) END,
            CASE WHEN v_rec.joining_period_start_days_offset IS NOT NULL THEN v_now + make_interval(days => v_rec.joining_period_start_days_offset) END,
            CASE WHEN v_rec.joining_period_end_days_offset IS NOT NULL THEN v_now + make_interval(days => v_rec.joining_period_end_days_offset) END,
            CASE WHEN v_rec.calving_processed_days_offset IS NOT NULL THEN v_now + make_interval(days => v_rec.calving_processed_days_offset) END,
            CASE WHEN v_rec.calf_weight_recorded_days_offset IS NOT NULL THEN (v_now + make_interval(days => v_rec.calf_weight_recorded_days_offset))::date END,
            v_rec.mortality_rate, v_rec.breed_premium_override,
            v_rec.paddock_name, v_rec.selected_saleyard, v_rec.notes, v_rec.additional_info,
            v_rec.is_sold,
            CASE WHEN v_rec.sold_days_offset IS NOT NULL THEN v_now + make_interval(days => v_rec.sold_days_offset) END,
            v_rec.sold_price,
            v_created_at, v_now
        );

        v_herd_count := v_herd_count + 1;
    END LOOP;

    RETURN QUERY SELECT v_prop_count, v_herd_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_demo_data_tier1(uuid) TO authenticated;

-- Convenience overload that uses auth.uid(), so the signed-in demo user can
-- re-seed themselves (used by iOS DemoDataGenerator+SupabaseSeed and web demo flow).
CREATE OR REPLACE FUNCTION public.seed_demo_data_tier1()
RETURNS TABLE(property_count integer, herd_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    RETURN QUERY SELECT * FROM public.seed_demo_data_tier1(v_uid);
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_demo_data_tier1() TO authenticated;

-- ==========================================================================
-- 4. RLS: block all writes from the demo user on data tables
--    (Brangus chat + session tables remain writable so chat works in demo.)
-- ==========================================================================

DO $$
DECLARE
    v_demo_uid constant uuid := 'f8c88530-a6ac-41a3-a6ce-7cac3369ec0d';
    v_tables text[] := ARRAY[
        'herds','properties','sales_records','yard_book_items','health_records','muster_records',
        'consignments','saved_freight_estimates','custom_sale_locations',
        'processor_grids','processors','grid_iq_analyses','kill_sheet_records',
        'market_price_alerts','portfolio_snapshots','report_exports',
        'user_profiles','user_subscriptions'
    ];
    v_tbl text;
BEGIN
    FOREACH v_tbl IN ARRAY v_tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS demo_readonly_block_insert ON public.%I', v_tbl);
        EXECUTE format('DROP POLICY IF EXISTS demo_readonly_block_update ON public.%I', v_tbl);
        EXECUTE format('DROP POLICY IF EXISTS demo_readonly_block_delete ON public.%I', v_tbl);

        EXECUTE format(
            'CREATE POLICY demo_readonly_block_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() <> %L::uuid)',
            v_tbl, v_demo_uid
        );
        EXECUTE format(
            'CREATE POLICY demo_readonly_block_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (auth.uid() <> %L::uuid) WITH CHECK (auth.uid() <> %L::uuid)',
            v_tbl, v_demo_uid, v_demo_uid
        );
        EXECUTE format(
            'CREATE POLICY demo_readonly_block_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (auth.uid() <> %L::uuid)',
            v_tbl, v_demo_uid
        );
    END LOOP;
END $$;
