-- Reproducible seed for the demo producer john@redriverdowns.com.au
-- (user_id f920dc01-61f3-4952-b051-74ac32b4867c) used for app screenshots
-- and marketing videos. Property: Red River Downs, Surat QLD.
--
-- PREREQUISITE: the auth.users row must exist before running this script.
-- Create it via the Supabase Auth Admin API:
--
--   curl -X POST https://<project>.supabase.co/auth/v1/admin/users \
--     -H "Authorization: Bearer <service-role-key>" \
--     -H "Content-Type: application/json" \
--     -d '{"id":"f920dc01-61f3-4952-b051-74ac32b4867c",
--          "email":"john@redriverdowns.com.au",
--          "password":"<choose>","email_confirm":true}'
--
-- All categories use the master taxonomy (Steer/Heifer/Breeder/Dry Cow/Bull)
-- introduced in migration 20260317100002. The original seed used legacy
-- 16-category strings — see backfill_demo_producer_categories.sql for the
-- one-off fix to data inserted before this seed existed.
--
-- Idempotent: parent rows (profile, property, herds, subscription) UPSERT;
-- child collections (sales, health, muster, yardbook, freight estimates)
-- DELETE then re-INSERT so re-running brings the demo back to a known state.
--
-- Excluded from this seed (seed separately if needed):
--   - connection_requests   — references other auth users
--   - glovebox_files        — references storage objects (PDFs)
--   - portfolio_snapshots   — computed by the dashboard, not a fixture
--   - brangus_messages, notifications, usage_tracking, device_tokens,
--     grid_iq_analyses, processor_grids, report_exports

DO $$
DECLARE
    v_uid       uuid := 'f920dc01-61f3-4952-b051-74ac32b4867c';
    v_property  uuid := '11111111-1111-4111-8111-000000000001';
BEGIN
    -- ------------------------------------------------------------------
    -- 1. Profile
    -- ------------------------------------------------------------------
    INSERT INTO public.user_profiles (
        id, user_id, display_name, company_name, property_name,
        state, region, role, is_discoverable, is_listed_in_directory,
        contact_email, contact_phone, bio,
        is_discoverable_to_producers, subscription_tier, onboarding_completed,
        business_type, business_address, is_admin, avatar_url,
        created_at, updated_at
    ) VALUES (
        '4c91220e-512c-44b2-a9ae-92aff7e53914',
        v_uid,
        'John Wayne',
        'Red River Downs',
        'Red River Downs',
        'QLD', 'Maranoa', 'producer',
        false, false,
        'john@redriverdowns.com.au', '0526 091 907',
        'Family-run breeder and grow-out operation on the black soil country south of Roma. Predominantly Angus breeders joined to Brangus bulls, with steers turned off through Roma Saleyards. Cattle running on this country since 1907.',
        false, 'stockman', true,
        'Pastoral', '2148 Surat Talwood Rd, Surat QLD 4417',
        false,
        'https://glxnmljnuzigyqydsxhc.supabase.co/storage/v1/object/public/profile-photos/avatars/f920dc01-61f3-4952-b051-74ac32b4867c.jpeg',
        '2026-04-30 08:06:53.750317+00',
        '2026-05-03 05:43:16.433374+00'
    )
    ON CONFLICT (user_id) DO UPDATE SET
        display_name         = EXCLUDED.display_name,
        company_name         = EXCLUDED.company_name,
        property_name        = EXCLUDED.property_name,
        state                = EXCLUDED.state,
        region               = EXCLUDED.region,
        contact_email        = EXCLUDED.contact_email,
        contact_phone        = EXCLUDED.contact_phone,
        bio                  = EXCLUDED.bio,
        subscription_tier    = EXCLUDED.subscription_tier,
        onboarding_completed = EXCLUDED.onboarding_completed,
        business_type        = EXCLUDED.business_type,
        business_address     = EXCLUDED.business_address,
        avatar_url           = EXCLUDED.avatar_url,
        updated_at           = EXCLUDED.updated_at;

    -- ------------------------------------------------------------------
    -- 2. Subscription
    -- ------------------------------------------------------------------
    INSERT INTO public.user_subscriptions (
        id, user_id, tier, is_active, platform,
        product_id, expires_at, original_purchase_at, last_verified_at,
        created_at, updated_at
    ) VALUES (
        '636fdb91-c319-481b-b906-a3fbddc2f9db',
        v_uid, 'stockman', true, 'web',
        'stockman_annual',
        '2027-05-11 17:00:00+00',
        '2024-05-11 17:00:00+00',
        '2026-04-30 08:06:53.750317+00',
        '2026-04-30 08:06:53.750317+00',
        '2026-04-30 08:06:53.750317+00'
    )
    ON CONFLICT (id) DO UPDATE SET
        tier              = EXCLUDED.tier,
        is_active         = EXCLUDED.is_active,
        expires_at        = EXCLUDED.expires_at,
        last_verified_at  = EXCLUDED.last_verified_at,
        updated_at        = EXCLUDED.updated_at;

    -- ------------------------------------------------------------------
    -- 3. Property
    -- ------------------------------------------------------------------
    INSERT INTO public.properties (
        id, user_id, property_name, is_default, is_simulated,
        state, region, address, suburb, postcode,
        latitude, longitude, acreage, property_type, notes,
        default_saleyard, default_saleyard_distance,
        mortality_rate, calving_rate, freight_cost_per_km,
        is_deleted, lga, location_source,
        created_at, updated_at
    ) VALUES (
        v_property, v_uid,
        'Red River Downs', true, false,
        'QLD', 'Maranoa',
        '2148 Surat Talwood Rd', 'Surat', '4417',
        -27.1539, 149.0712, 2965,
        'Mixed Breeder & Grow-out',
        'Black soil country, established Buffel and Mitchell grass pastures. Three sets of yards (home yards, north paddock yards, river yards). Bore-fed water supply across 18 paddocks. On the country since 1907.',
        'Roma Saleyards', 82,
        0.04, 0.86, 3.2,
        false, 'Maranoa Regional', 'geocoded',
        '2024-05-11 17:00:00+00',
        '2026-04-30 08:49:08.348826+00'
    )
    ON CONFLICT (id) DO UPDATE SET
        property_name             = EXCLUDED.property_name,
        is_default                = EXCLUDED.is_default,
        state                     = EXCLUDED.state,
        region                    = EXCLUDED.region,
        address                   = EXCLUDED.address,
        suburb                    = EXCLUDED.suburb,
        postcode                  = EXCLUDED.postcode,
        latitude                  = EXCLUDED.latitude,
        longitude                 = EXCLUDED.longitude,
        acreage                   = EXCLUDED.acreage,
        property_type             = EXCLUDED.property_type,
        notes                     = EXCLUDED.notes,
        default_saleyard          = EXCLUDED.default_saleyard,
        default_saleyard_distance = EXCLUDED.default_saleyard_distance,
        mortality_rate            = EXCLUDED.mortality_rate,
        calving_rate              = EXCLUDED.calving_rate,
        freight_cost_per_km       = EXCLUDED.freight_cost_per_km,
        updated_at                = EXCLUDED.updated_at;

    -- ------------------------------------------------------------------
    -- 4. Herds (12 rows — 8 active + 4 sold). All values use the master
    --    taxonomy. sub_category derived per defaultMappingRules from
    --    current_weight (lib/data/weight-mapping.ts).
    -- ------------------------------------------------------------------
    INSERT INTO public.herds (
        id, user_id, name, animal_id_number, species, breed, sex,
        category, sub_category, breeder_sub_type,
        age_months, head_count, initial_weight, current_weight,
        daily_weight_gain, use_creation_date_for_weight,
        is_breeder, is_pregnant, joined_date, calving_rate,
        breeding_program_type, joining_period_start, joining_period_end,
        selected_saleyard, is_sold, sold_date, sold_price,
        paddock_name, property_id, additional_info, notes,
        mortality_rate, calf_weight_recorded_date,
        is_demo_data, is_deleted, livestock_owner,
        created_at, updated_at
    ) VALUES
    -- Active herds
    ('22222222-2222-4222-8222-000000000001', v_uid,
     'Whitaker Breeders 2025', 'WD-BR-25', 'Cattle', 'Angus', 'Female',
     'Breeder', 'Cow', 'Cow',
     60, 320, 530, 540, 0.0, false,
     true, true, '2025-11-14 14:00:00+00', 0.86,
     'controlled', '2025-10-14 14:00:00+00', '2025-12-30 14:00:00+00',
     'Roma Saleyards', false, NULL, NULL,
     'River Run', v_property,
     'Calves at Foot: 95 head, 4 months, 110 kg',
     'Strong condition heading into winter. PTIC scanned at 92%.',
     0.04, '2026-03-17 21:00:00+00',
     false, false, 'Whitaker Pastoral Co.',
     '2025-04-19 17:00:00+00', '2026-04-30 08:13:30.442461+00'),

    ('22222222-2222-4222-8222-000000000002', v_uid,
     'Replacement Heifers 2025', 'WD-RH-25', 'Cattle', 'Angus', 'Female',
     'Heifer', 'Yearling', NULL,
     18, 110, 320, 405, 0.4, false,
     false, false, NULL, 0.86,
     NULL, NULL, NULL,
     'Roma Saleyards', false, NULL, NULL,
     'Searchers Run', v_property, NULL,
     'Best of last year''s drop. Will be joined to AI program in October 2026.',
     0.04, NULL, false, false, 'Whitaker Pastoral Co.',
     '2025-09-09 17:00:00+00', '2026-04-30 08:49:08.348826+00'),

    ('22222222-2222-4222-8222-000000000003', v_uid,
     'Yearling Steers Heavy', 'WD-YS-26H', 'Cattle', 'Angus', 'Male',
     'Steer', 'Grown', NULL,
     16, 160, 380, 503, 0.7, false,
     false, false, NULL, 0,
     NULL, NULL, NULL,
     'Roma Saleyards', false, NULL, NULL,
     'Stagecoach Flat', v_property, NULL,
     'Heaviest of the 2025 drop. Tracking for September prime sale.',
     0.04, NULL, false, false, 'Whitaker Pastoral Co.',
     '2025-11-04 17:00:00+00', '2026-04-30 08:57:33.107+00'),

    ('22222222-2222-4222-8222-000000000004', v_uid,
     'Yearling Steers Light', 'WD-YS-26L', 'Cattle', 'Angus', 'Male',
     'Steer', 'Yearling', NULL,
     13, 170, 310, 384, 0.7, false,
     false, false, NULL, 0,
     NULL, NULL, NULL,
     'Roma Saleyards', false, NULL, NULL,
     'Rio Bravo Channels', v_property, NULL,
     'Coming on quickly post-summer. Mineral lick out.',
     0.04, NULL, false, false, 'Whitaker Pastoral Co.',
     '2026-01-14 17:00:00+00', '2026-04-30 08:49:08.348826+00'),

    ('22222222-2222-4222-8222-000000000005', v_uid,
     'Weaner Steers Autumn 2026', 'WD-WS-26', 'Cattle', 'Angus', 'Male',
     'Steer', 'Weaner', NULL,
     8, 140, 240, 264, 0.6, false,
     false, false, NULL, 0,
     NULL, NULL, NULL,
     'Roma Saleyards', false, NULL, NULL,
     'Weaner Yards', v_property, NULL,
     'Off the breeders mob March muster. Yard weaned 14 days.',
     0.04, NULL, false, false, 'Whitaker Pastoral Co.',
     '2026-03-19 17:00:00+00', '2026-04-19 21:00:00+00'),

    ('22222222-2222-4222-8222-000000000006', v_uid,
     'Weaner Heifers Autumn 2026', 'WD-WH-26', 'Cattle', 'Angus', 'Female',
     'Heifer', 'Weaner', NULL,
     8, 100, 220, 240, 0.5, false,
     false, false, NULL, 0,
     NULL, NULL, NULL,
     'Roma Saleyards', false, NULL, NULL,
     'Weaner Yards', v_property, NULL,
     'Selecting top 80 as future replacements after weighing in October.',
     0.04, NULL, false, false, 'Whitaker Pastoral Co.',
     '2026-03-19 17:00:00+00', '2026-04-19 21:00:00+00'),

    ('22222222-2222-4222-8222-000000000007', v_uid,
     'Grown Steers May Sale', 'WD-GS-26M', 'Cattle', 'Angus', 'Male',
     'Steer', 'Grown', NULL,
     28, 80, 540, 675, 0.5, false,
     false, false, NULL, 0,
     NULL, NULL, NULL,
     'Roma Saleyards', false, NULL, NULL,
     'True Grit Block', v_property, NULL,
     'Booked in for Roma 14 May Prime sale. Final weighing 12 May.',
     0.04, NULL, false, false, 'Whitaker Pastoral Co.',
     '2025-07-31 17:00:00+00', '2026-04-30 08:49:08.348826+00'),

    ('22222222-2222-4222-8222-000000000008', v_uid,
     'Stud Bulls', 'WD-BL', 'Cattle', 'Brangus', 'Male',
     'Bull', 'Grown', NULL,
     48, 8, 850, 850, 0.0, false,
     false, false, NULL, 0,
     NULL, NULL, NULL,
     'Roma Saleyards', false, NULL, NULL,
     'Duke''s Paddock', v_property, NULL,
     'Working bulls, sourced from Red River Brangus Stud 2024 sale. Lead bulls Duke and Ringo. BBSE October each year.',
     0.03, NULL, false, false, 'Whitaker Pastoral Co.',
     '2024-08-14 17:00:00+00', '2026-04-30 08:49:08.348826+00'),

    -- Sold herds (kept for sales history & dashboard)
    ('22222222-2222-4222-8222-000000000101', v_uid,
     'Yearling Steers 2024', 'WD-YS-24', 'Cattle', 'Angus', 'Male',
     'Steer', 'Yearling', NULL,
     14, 180, 360, 490, 0.7, false,
     false, false, NULL, 0,
     NULL, NULL, NULL,
     'Roma Saleyards', true, '2024-09-14 22:00:00+00', 4.8,
     'Stagecoach Flat', v_property, NULL,
     'Strong Roma sale, $4.80/kg achieved.',
     0.04, NULL, false, false, 'Whitaker Pastoral Co.',
     '2024-05-14 17:00:00+00', '2026-04-30 08:49:08.348826+00'),

    ('22222222-2222-4222-8222-000000000102', v_uid,
     'Cull Cows Autumn 2025', 'WD-CC-25A', 'Cattle', 'Angus', 'Female',
     'Dry Cow', 'Cows', NULL,
     84, 90, 480, 498, 0.05, false,
     false, false, NULL, 0,
     NULL, NULL, NULL,
     'Roma Saleyards', true, '2025-04-07 22:00:00+00', 2.85,
     'Holding Paddock', v_property, NULL,
     'Empties scanned out. Roma cow & calf sale.',
     0.04, NULL, false, false, 'Whitaker Pastoral Co.',
     '2024-07-31 17:00:00+00', '2025-04-08 08:00:00+00'),

    ('22222222-2222-4222-8222-000000000103', v_uid,
     'Yearling Steers 2025', 'WD-YS-25', 'Cattle', 'Angus', 'Male',
     'Steer', 'Grown', NULL,
     16, 200, 380, 510, 0.7, false,
     false, false, NULL, 0,
     NULL, NULL, NULL,
     'Roma Saleyards', true, '2025-10-21 22:00:00+00', 5.2,
     'Stagecoach Flat', v_property, NULL,
     'Top pen Roma October sale - $5.20/kg.',
     0.04, NULL, false, false, 'Whitaker Pastoral Co.',
     '2025-04-24 17:00:00+00', '2026-04-30 08:49:08.348826+00'),

    ('22222222-2222-4222-8222-000000000104', v_uid,
     'Grown Steers Feb 2026', 'WD-GS-26F', 'Cattle', 'Angus', 'Male',
     'Steer', 'Grown', NULL,
     30, 75, 580, 665, 0.5, false,
     false, false, NULL, 0,
     NULL, NULL, NULL,
     'Roma Saleyards', true, '2026-02-13 22:00:00+00', 4.1,
     'True Grit Block', v_property, NULL,
     'Heavy steers booked into Roma Prime sale.',
     0.04, NULL, false, false, 'Whitaker Pastoral Co.',
     '2025-08-31 17:00:00+00', '2026-04-30 08:49:08.348826+00')
    ON CONFLICT (id) DO UPDATE SET
        name              = EXCLUDED.name,
        animal_id_number  = EXCLUDED.animal_id_number,
        species           = EXCLUDED.species,
        breed             = EXCLUDED.breed,
        sex               = EXCLUDED.sex,
        category          = EXCLUDED.category,
        sub_category      = EXCLUDED.sub_category,
        breeder_sub_type  = EXCLUDED.breeder_sub_type,
        age_months        = EXCLUDED.age_months,
        head_count        = EXCLUDED.head_count,
        initial_weight    = EXCLUDED.initial_weight,
        current_weight    = EXCLUDED.current_weight,
        daily_weight_gain = EXCLUDED.daily_weight_gain,
        is_breeder        = EXCLUDED.is_breeder,
        is_pregnant       = EXCLUDED.is_pregnant,
        joined_date       = EXCLUDED.joined_date,
        calving_rate      = EXCLUDED.calving_rate,
        breeding_program_type  = EXCLUDED.breeding_program_type,
        joining_period_start   = EXCLUDED.joining_period_start,
        joining_period_end     = EXCLUDED.joining_period_end,
        selected_saleyard = EXCLUDED.selected_saleyard,
        is_sold           = EXCLUDED.is_sold,
        sold_date         = EXCLUDED.sold_date,
        sold_price        = EXCLUDED.sold_price,
        paddock_name      = EXCLUDED.paddock_name,
        property_id       = EXCLUDED.property_id,
        additional_info   = EXCLUDED.additional_info,
        notes             = EXCLUDED.notes,
        mortality_rate    = EXCLUDED.mortality_rate,
        calf_weight_recorded_date = EXCLUDED.calf_weight_recorded_date,
        livestock_owner   = EXCLUDED.livestock_owner,
        updated_at        = EXCLUDED.updated_at;

    -- ------------------------------------------------------------------
    -- 5. Sales records (DELETE + INSERT)
    -- ------------------------------------------------------------------
    DELETE FROM public.sales_records WHERE user_id = v_uid;

    INSERT INTO public.sales_records (
        id, user_id, herd_id, sale_date, head_count, average_weight,
        price_per_kg, pricing_type, sale_type, sale_location,
        total_gross_value, freight_cost, freight_distance, net_value,
        notes, is_demo_data, is_deleted, created_at, updated_at
    ) VALUES
    ('33333333-3333-4333-8333-000000000001', v_uid,
     '22222222-2222-4222-8222-000000000101',
     '2024-09-14 22:00:00+00', 180, 490, 4.8, 'per_kg',
     'Saleyard', 'Roma Saleyards',
     423360, 2772, 82, 420588,
     'Roma store sale, 14 Sep. Strong feeder demand.',
     false, false, '2024-09-15 09:00:00+00', '2024-09-15 09:00:00+00'),

    ('33333333-3333-4333-8333-000000000002', v_uid,
     '22222222-2222-4222-8222-000000000102',
     '2025-04-07 22:00:00+00', 90, 498, 2.85, 'per_kg',
     'Saleyard', 'Roma Saleyards',
     127737, 1098, 82, 126639,
     'Cull cow run, scanned empties out before joining.',
     false, false, '2025-04-08 09:00:00+00', '2025-04-08 09:00:00+00'),

    ('33333333-3333-4333-8333-000000000003', v_uid,
     '22222222-2222-4222-8222-000000000103',
     '2025-10-21 22:00:00+00', 200, 510, 5.2, 'per_kg',
     'Saleyard', 'Roma Saleyards',
     530400, 3080, 82, 527320,
     'Top pen of the day, $5.20/kg. Buyers from Stanbroke and JBS.',
     false, false, '2025-10-22 09:00:00+00', '2025-10-22 09:00:00+00'),

    ('33333333-3333-4333-8333-000000000004', v_uid,
     '22222222-2222-4222-8222-000000000104',
     '2026-02-13 22:00:00+00', 75, 665, 4.1, 'per_kg',
     'Saleyard', 'Roma Saleyards',
     204487.5, 1387.5, 82, 203100,
     'Prime sale - heavy steers, MSA graded.',
     false, false, '2026-02-14 09:00:00+00', '2026-02-14 09:00:00+00');

    -- ------------------------------------------------------------------
    -- 6. Health records (DELETE + INSERT)
    -- ------------------------------------------------------------------
    DELETE FROM public.health_records WHERE user_id = v_uid;

    INSERT INTO public.health_records (
        id, user_id, herd_id, date, treatment_type_raw, notes,
        is_demo_data, is_deleted, created_at, updated_at, photo_paths
    ) VALUES
    ('55555555-5555-4555-8555-000000000001', v_uid, NULL, '2024-06-11 22:00:00+00', '7-in-1 Vaccination', 'Whole herd vaccinated, 412 head', false, false, '2024-06-12 09:00:00+00', '2024-06-12 09:00:00+00', '{}'),
    ('55555555-5555-4555-8555-000000000002', v_uid, NULL, '2024-08-19 22:00:00+00', 'Drenching', 'Yearling steers - Cydectin pour-on. Bulls BBSE passed.', false, false, '2024-08-20 09:00:00+00', '2024-08-20 09:00:00+00', '{}'),
    ('55555555-5555-4555-8555-000000000003', v_uid, '22222222-2222-4222-8222-000000000008', '2024-09-01 22:00:00+00', 'BBSE', 'All 8 bulls passed BBSE - Dr. McKenzie, Roma Vets', false, false, '2024-09-02 09:00:00+00', '2024-09-02 09:00:00+00', '{}'),
    ('55555555-5555-4555-8555-000000000004', v_uid, NULL, '2024-11-04 22:00:00+00', 'Branding', '95 calves branded, ear tagged, dehorned, 5-in-1 vaccine', false, false, '2024-11-05 09:00:00+00', '2024-11-05 09:00:00+00', '{}'),
    ('55555555-5555-4555-8555-000000000005', v_uid, NULL, '2024-12-14 22:00:00+00', 'Fly Treatment', 'Buffalo fly back-rubber stations refilled across all paddocks', false, false, '2024-12-15 09:00:00+00', '2024-12-15 09:00:00+00', '{}'),
    ('55555555-5555-4555-8555-000000000006', v_uid, NULL, '2025-02-17 22:00:00+00', 'Tick Treatment', 'Plunge dipping, full herd. Heavy season this year.', false, false, '2025-02-18 09:00:00+00', '2025-02-18 09:00:00+00', '{}'),
    ('55555555-5555-4555-8555-000000000007', v_uid, NULL, '2025-04-03 22:00:00+00', '7-in-1 Vaccination', 'Weaners (102 head) and any unvaccinated stock', false, false, '2025-04-04 09:00:00+00', '2025-04-04 09:00:00+00', '{}'),
    ('55555555-5555-4555-8555-000000000008', v_uid, NULL, '2025-04-03 23:00:00+00', 'Drenching', 'Weaners drenched, ivermectin pour-on', false, false, '2025-04-04 09:00:00+00', '2025-04-04 09:00:00+00', '{}'),
    ('55555555-5555-4555-8555-000000000009', v_uid, NULL, '2025-06-21 22:00:00+00', 'Pregnancy Testing', 'Cows scanned - 88% PTIC across mob', false, false, '2025-06-22 09:00:00+00', '2025-06-22 09:00:00+00', '{}'),
    ('55555555-5555-4555-8555-000000000010', v_uid, NULL, '2025-07-21 22:00:00+00', 'Drenching', 'Winter herd drench, supplementation started', false, false, '2025-07-22 09:00:00+00', '2025-07-22 09:00:00+00', '{}'),
    ('55555555-5555-4555-8555-000000000011', v_uid, '22222222-2222-4222-8222-000000000008', '2025-09-30 22:00:00+00', 'BBSE', 'Annual bull check - all 8 passed', false, false, '2025-10-01 09:00:00+00', '2025-10-01 09:00:00+00', '{}'),
    ('55555555-5555-4555-8555-000000000012', v_uid, '22222222-2222-4222-8222-000000000001', '2025-10-04 22:00:00+00', 'Pregnancy Testing', 'Pre-joining scan - 92% PTIC, 12 empties drafted to cull', false, false, '2025-10-05 09:00:00+00', '2025-10-05 09:00:00+00', '{}'),
    ('55555555-5555-4555-8555-000000000013', v_uid, NULL, '2025-11-09 22:00:00+00', 'Branding', '110 calves branded and processed', false, false, '2025-11-10 09:00:00+00', '2025-11-10 09:00:00+00', '{}'),
    ('55555555-5555-4555-8555-000000000014', v_uid, NULL, '2025-12-07 22:00:00+00', '7-in-1 Vaccination', 'Booster shots for breeders', false, false, '2025-12-08 09:00:00+00', '2025-12-08 09:00:00+00', '{}'),
    ('55555555-5555-4555-8555-000000000015', v_uid, NULL, '2026-01-13 22:00:00+00', 'Fly Treatment', 'Buffalo fly tags applied to all cattle', false, false, '2026-01-14 09:00:00+00', '2026-01-14 09:00:00+00', '{}'),
    ('55555555-5555-4555-8555-000000000016', v_uid, NULL, '2026-02-21 22:00:00+00', 'Tick Treatment', 'Plunge dip, herd-wide', false, false, '2026-02-22 09:00:00+00', '2026-02-22 09:00:00+00', '{}'),
    ('55555555-5555-4555-8555-000000000017', v_uid, NULL, '2026-03-17 22:00:00+00', '7-in-1 Vaccination', '240 autumn weaners, first vaccination', false, false, '2026-03-18 09:00:00+00', '2026-03-18 09:00:00+00', '{}'),
    ('55555555-5555-4555-8555-000000000018', v_uid, NULL, '2026-03-17 23:00:00+00', 'Drenching', 'Weaner drench, ivermectin', false, false, '2026-03-18 09:00:00+00', '2026-03-18 09:00:00+00', '{}'),
    ('55555555-5555-4555-8555-000000000019', v_uid, NULL, '2026-04-14 22:00:00+00', 'Pre-sale Weighing', 'May sale steers - average 540kg', false, false, '2026-04-15 09:00:00+00', '2026-04-15 09:00:00+00', '{}'),
    ('55555555-5555-4555-8555-000000000020', v_uid, NULL, '2026-04-21 22:00:00+00', 'Drenching', 'Final pre-sale drench for May Roma steers', false, false, '2026-04-22 09:00:00+00', '2026-04-22 09:00:00+00', '{}');

    -- ------------------------------------------------------------------
    -- 7. Muster records (DELETE + INSERT)
    -- ------------------------------------------------------------------
    DELETE FROM public.muster_records WHERE user_id = v_uid;

    INSERT INTO public.muster_records (
        id, user_id, herd_id, date, notes,
        total_head_count, cattle_yard, weaners_count, branders_count,
        is_demo_data, is_deleted, created_at, updated_at, photo_paths
    ) VALUES
    ('44444444-4444-4444-8444-000000000001', v_uid, NULL, '2024-06-11 21:00:00+00', 'First full muster post-purchase. Counted everything. River paddock dry.', 412, 'Home Yards', NULL, NULL, false, false, '2024-06-12 09:00:00+00', '2024-06-12 09:00:00+00', '{}'),
    ('44444444-4444-4444-8444-000000000002', v_uid, NULL, '2024-08-19 21:00:00+00', 'Pre-sale muster, drafted yearling steers off. Bulls came in same day for BBSE.', 412, 'North Paddock Yards', NULL, NULL, false, false, '2024-08-20 09:00:00+00', '2024-08-20 09:00:00+00', '{}'),
    ('44444444-4444-4444-8444-000000000003', v_uid, NULL, '2024-11-04 21:00:00+00', 'Branding muster - 95 calves through.', 95, 'Home Yards', NULL, 95, false, false, '2024-11-05 09:00:00+00', '2024-11-05 09:00:00+00', '{}'),
    ('44444444-4444-4444-8444-000000000004', v_uid, NULL, '2025-02-17 21:00:00+00', 'Mid-summer check. Tail-end cows looking poor, drafted off.', 330, 'Home Yards', NULL, NULL, false, false, '2025-02-18 09:00:00+00', '2025-02-18 09:00:00+00', '{}'),
    ('44444444-4444-4444-8444-000000000005', v_uid, NULL, '2025-04-03 21:00:00+00', 'Weaner muster - 102 weaners. Cull cows drafted.', 330, 'Home Yards', 102, NULL, false, false, '2025-04-04 09:00:00+00', '2025-04-04 09:00:00+00', '{}'),
    ('44444444-4444-4444-8444-000000000006', v_uid, NULL, '2025-07-21 21:00:00+00', 'Winter check, supplementation started.', 680, 'River Yards', NULL, NULL, false, false, '2025-07-22 09:00:00+00', '2025-07-22 09:00:00+00', '{}'),
    ('44444444-4444-4444-8444-000000000007', v_uid, NULL, '2025-10-04 21:00:00+00', 'Pre-joining muster, bulls in. Cows scanned, 92% PTIC.', 355, 'Home Yards', NULL, NULL, false, false, '2025-10-05 09:00:00+00', '2025-10-05 09:00:00+00', '{}'),
    ('44444444-4444-4444-8444-000000000008', v_uid, NULL, '2025-10-14 21:00:00+00', 'Yearling steers drafted for Roma sale.', 200, 'North Paddock Yards', NULL, NULL, false, false, '2025-10-15 09:00:00+00', '2025-10-15 09:00:00+00', '{}'),
    ('44444444-4444-4444-8444-000000000009', v_uid, NULL, '2025-12-07 21:00:00+00', 'Post-joining muster, bulls out. Yearling weights up.', 940, 'Home Yards', NULL, NULL, false, false, '2025-12-08 09:00:00+00', '2025-12-08 09:00:00+00', '{}'),
    ('44444444-4444-4444-8444-000000000010', v_uid, NULL, '2026-02-03 21:00:00+00', 'Heavy steers booked for Feb prime sale, drafted 75 head.', 75, 'Lucerne Block Yards', NULL, NULL, false, false, '2026-02-04 09:00:00+00', '2026-02-04 09:00:00+00', '{}'),
    ('44444444-4444-4444-8444-000000000011', v_uid, NULL, '2026-03-17 21:00:00+00', 'Autumn weaner muster, 240 weaners off, yard weaned.', 1058, 'Home Yards', 240, NULL, false, false, '2026-03-18 09:00:00+00', '2026-03-18 09:00:00+00', '{}'),
    ('44444444-4444-4444-8444-000000000012', v_uid, NULL, '2026-04-14 21:00:00+00', 'Pre-sale weighing for May Roma prime sale.', 80, 'Lucerne Block Yards', NULL, NULL, false, false, '2026-04-15 09:00:00+00', '2026-04-15 09:00:00+00', '{}');

    -- ------------------------------------------------------------------
    -- 8. Yard book items (DELETE + INSERT)
    -- ------------------------------------------------------------------
    DELETE FROM public.yard_book_items WHERE user_id = v_uid;

    INSERT INTO public.yard_book_items (
        id, user_id, title, notes, event_date, is_all_day,
        category_raw, is_completed, completed_date,
        is_recurring, linked_herd_ids, property_id,
        is_demo_data, is_deleted, notifications_scheduled,
        created_at, updated_at
    ) VALUES
    ('66666666-6666-4666-8666-000000000001', v_uid, '7-in-1 booster - breeders', 'Yarded breeders for booster shots', '2026-01-07 21:00:00+00', true, 'Livestock', true, '2026-01-08 01:00:00+00', false, '["22222222-2222-4222-8222-000000000001"]', v_property, false, false, false, '2025-12-19 21:00:00+00', '2026-01-08 01:00:00+00'),
    ('66666666-6666-4666-8666-000000000002', v_uid, 'Buffalo fly tags', 'Tag heifers and breeders', '2026-01-13 21:00:00+00', true, 'Livestock', true, '2026-01-14 05:00:00+00', false, NULL, v_property, false, false, false, '2026-01-01 21:00:00+00', '2026-01-14 05:00:00+00'),
    ('66666666-6666-4666-8666-000000000003', v_uid, 'Roma Prime Sale - heavy steers', 'Truck departs 5am, Tuesday', '2026-02-13 19:00:00+00', false, 'Livestock', true, '2026-02-14 08:00:00+00', false, '["22222222-2222-4222-8222-000000000104"]', v_property, false, false, false, '2026-01-24 21:00:00+00', '2026-02-14 08:00:00+00'),
    ('66666666-6666-4666-8666-000000000004', v_uid, 'Plunge dip', 'All cattle, tick season', '2026-02-21 21:00:00+00', true, 'Livestock', true, '2026-02-22 06:00:00+00', false, NULL, v_property, false, false, false, '2026-02-09 21:00:00+00', '2026-02-22 06:00:00+00'),
    ('66666666-6666-4666-8666-000000000005', v_uid, 'Autumn weaner muster', 'Wean off cows, yard 14 days', '2026-03-17 20:00:00+00', true, 'Livestock', true, '2026-03-18 10:00:00+00', false, NULL, v_property, false, false, false, '2026-02-28 21:00:00+00', '2026-03-18 10:00:00+00'),
    ('66666666-6666-4666-8666-000000000006', v_uid, 'Order weaner pellets', '30T from Riverina, delivery to home shed', '2026-03-21 23:00:00+00', false, 'Operations', true, '2026-03-22 00:00:00+00', false, NULL, v_property, false, false, false, '2026-03-14 21:00:00+00', '2026-03-22 00:00:00+00'),
    ('66666666-6666-4666-8666-000000000007', v_uid, 'BAS Q3 lodgement', 'March quarter BAS', '2026-03-31 23:00:00+00', false, 'Finance', true, '2026-04-02 05:00:00+00', false, NULL, v_property, false, false, false, '2026-03-24 21:00:00+00', '2026-04-02 05:00:00+00'),
    ('66666666-6666-4666-8666-000000000008', v_uid, 'Weigh May sale steers', 'Final weigh & draft', '2026-04-14 21:00:00+00', true, 'Livestock', true, '2026-04-15 03:00:00+00', false, '["22222222-2222-4222-8222-000000000007"]', v_property, false, false, false, '2026-04-04 21:00:00+00', '2026-04-15 03:00:00+00'),
    ('66666666-6666-4666-8666-000000000009', v_uid, 'Service the Polaris', 'Pre-muster service', '2026-04-11 23:00:00+00', false, 'Operations', true, '2026-04-12 01:00:00+00', false, NULL, v_property, false, false, false, '2026-04-04 21:00:00+00', '2026-04-12 01:00:00+00'),
    ('66666666-6666-4666-8666-000000000010', v_uid, 'Insurance renewal - vehicle fleet', 'WFI quote due', '2026-04-19 23:00:00+00', false, 'Finance', true, '2026-04-21 00:00:00+00', false, NULL, v_property, false, false, false, '2026-04-09 21:00:00+00', '2026-04-21 00:00:00+00'),
    ('66666666-6666-4666-8666-000000000011', v_uid, 'Pre-sale drench - May steers', 'Cydectin pour-on', '2026-04-21 21:00:00+00', true, 'Livestock', true, '2026-04-22 01:00:00+00', false, '["22222222-2222-4222-8222-000000000007"]', v_property, false, false, false, '2026-04-14 21:00:00+00', '2026-04-22 01:00:00+00'),
    ('66666666-6666-4666-8666-000000000012', v_uid, 'Aissa''s school athletics carnival', 'Don''t miss it', '2026-03-27 22:00:00+00', false, 'Family', true, '2026-03-28 05:00:00+00', false, NULL, v_property, false, false, false, '2026-03-09 21:00:00+00', '2026-04-30 08:49:08.348826+00'),
    ('66666666-6666-4666-8666-000000000020', v_uid, 'Check trough - North Paddock', 'Last week''s repair, follow up', '2026-05-01 21:00:00+00', true, 'Operations', false, NULL, false, NULL, v_property, false, false, false, '2026-04-24 21:00:00+00', '2026-05-02 20:00:02.994745+00'),
    ('66666666-6666-4666-8666-000000000021', v_uid, 'Bottle teat replacement on poddies', 'Aissa wants to help', '2026-05-05 05:30:00+00', false, 'Family', false, NULL, false, NULL, v_property, false, false, false, '2026-04-28 21:00:00+00', '2026-04-30 08:49:08.348826+00'),
    ('66666666-6666-4666-8666-000000000022', v_uid, 'Truck steers to Roma - May Prime sale', '5am departure, two trucks', '2026-05-12 19:00:00+00', false, 'Livestock', false, NULL, false, '["22222222-2222-4222-8222-000000000007"]', v_property, false, false, false, '2026-04-14 21:00:00+00', '2026-04-14 21:00:00+00'),
    ('66666666-6666-4666-8666-000000000023', v_uid, 'Roma Prime Sale - May', 'Sale day', '2026-05-13 22:00:00+00', true, 'Livestock', false, NULL, false, '["22222222-2222-4222-8222-000000000007"]', v_property, false, false, false, '2026-03-14 21:00:00+00', '2026-04-14 21:00:00+00'),
    ('66666666-6666-4666-8666-000000000024', v_uid, 'Order winter hay', '30 round bales rhodes from Burns Creek', '2026-05-19 23:00:00+00', false, 'Operations', false, NULL, false, NULL, v_property, false, false, false, '2026-04-19 21:00:00+00', '2026-04-19 21:00:00+00'),
    ('66666666-6666-4666-8666-000000000025', v_uid, 'Winter herd drench', 'Whole herd, ivermectin', '2026-06-07 21:00:00+00', true, 'Livestock', false, NULL, false, NULL, v_property, false, false, false, '2026-04-14 21:00:00+00', '2026-04-14 21:00:00+00'),
    ('66666666-6666-4666-8666-000000000026', v_uid, 'Pregnancy testing - breeders', 'Dr. McKenzie, Roma Vets', '2026-06-21 22:00:00+00', true, 'Livestock', false, NULL, false, '["22222222-2222-4222-8222-000000000001"]', v_property, false, false, false, '2026-04-09 21:00:00+00', '2026-04-09 21:00:00+00'),
    ('66666666-6666-4666-8666-000000000027', v_uid, 'Quarterly BAS - June', 'Lodge July 28', '2026-07-27 23:00:00+00', false, 'Finance', false, NULL, false, NULL, v_property, false, false, false, '2026-03-31 21:00:00+00', '2026-03-31 21:00:00+00'),
    ('66666666-6666-4666-8666-000000000028', v_uid, 'Roma Store Sale - heavy yearlings', 'Target $5+/kg', '2026-09-08 22:00:00+00', true, 'Livestock', false, NULL, false, '["22222222-2222-4222-8222-000000000003"]', v_property, false, false, false, '2026-03-31 21:00:00+00', '2026-03-31 21:00:00+00'),
    ('66666666-6666-4666-8666-000000000029', v_uid, 'Bull BBSE check', 'Annual pre-joining', '2026-09-24 22:00:00+00', true, 'Livestock', false, NULL, false, '["22222222-2222-4222-8222-000000000008"]', v_property, false, false, false, '2026-03-31 21:00:00+00', '2026-03-31 21:00:00+00'),
    ('66666666-6666-4666-8666-000000000030', v_uid, 'Joining program 2026', 'Bulls in 15 Oct, out 31 Dec', '2026-10-14 21:00:00+00', true, 'Livestock', false, NULL, false, '["22222222-2222-4222-8222-000000000001"]', v_property, false, false, false, '2026-03-31 21:00:00+00', '2026-03-31 21:00:00+00');

    -- ------------------------------------------------------------------
    -- 9. Saved freight estimates (DELETE + INSERT)
    -- ------------------------------------------------------------------
    DELETE FROM public.saved_freight_estimates WHERE user_id = v_uid;

    INSERT INTO public.saved_freight_estimates (
        id, user_id, origin_property_name, destination_name,
        herd_name, category_name, head_count, average_weight_kg,
        heads_per_deck, decks_required, distance_km,
        rate_per_deck_per_km, total_cost, cost_per_head, cost_per_deck, cost_per_km,
        total_gst, total_with_gst, has_partial_deck, spare_spots_on_last_deck,
        is_custom_job, efficiency_prompt, assumptions_summary, short_cart_notice,
        is_deleted, saved_at, created_at, updated_at
    ) VALUES
    ('760337cf-a0b4-4ba6-80f3-17280322b39d', v_uid,
     'Red River Downs', 'Roma Saleyards',
     'Weaner Heifers Autumn 2026', 'Weaner Heifers', 100, 241,
     40, 3, 76,
     3.5, 798, 7.98, 266, 10.5,
     79.8, 877.8, true, 20,
     false,
     '20 spare spots on the last deck. Consider adding 20 more head to maximise freight efficiency.',
     'Weaner Heifers · 40 head/deck • 241kg avg weight • $3.50/deck/km',
     'Due to the short cart distance, your local carrier may work on a fixed fee rather than $/deck/km. Contact your carrier for a quote.',
     false, '2026-05-01 06:30:58.44+00', '2026-05-01 06:30:58.44+00', '2026-05-01 06:30:58.44+00'),

    ('a88ae91c-54fa-4ef5-bcbc-e150bfefa495', v_uid,
     'Red River Downs', 'Bairnsdale (Bairnsdale Saleyards)',
     'Grown Steers May Sale', 'Heavy Grown Steers', 80, 675,
     18, 5, 1554,
     3.5, 27195, 339.9375, 5439, 17.5,
     2719.5, 29914.5, true, 10,
     false,
     '10 spare spots on the last deck. Consider adding 10 more head to maximise freight efficiency.',
     'Heavy Grown Steers · 18 head/deck · 675kg avg weight · $3.50/deck/km · 1554 km',
     NULL,
     false, '2026-05-02 05:40:01.006+00', '2026-05-02 05:40:01.006+00', '2026-05-02 05:40:01.006+00');

END $$;
