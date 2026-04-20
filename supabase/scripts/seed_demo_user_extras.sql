-- One-time seed of Tier 2/3 data (sales, yard book, health, muster) for the
-- shared demo user. Run once after creating demo@stockmanswallet.com.au via the
-- Auth Admin API and calling seed_demo_data_tier1(demo_user_id) to populate
-- herds and properties.
--
-- Idempotent: re-running will clear existing records for the demo user and
-- reinsert from scratch.
--
-- The demo user UUID below is production-specific. Update if bootstrapping a
-- new environment.

DO $$
DECLARE
    v_uid uuid := 'f8c88530-a6ac-41a3-a6ce-7cac3369ec0d';
    v_pid uuid;
    v_sy_gracemere text := 'Gracemere Central Queensland Livestock Exchange';
    -- Herd ID lookups by name
    v_main_breeders uuid;
    v_first_calf uuid;
    v_wet_cows uuid;
    v_hereford uuid;
    v_weaner_heifers uuid;
    v_yearling_heifers uuid;
    v_weaner_steers uuid;
    v_yearling_steers uuid;
    v_feeder uuid;
    v_cull_cows uuid;
    v_herd_bulls uuid;
    v_young_bulls uuid;
    v_grown_sold uuid;
    v_cull_bulls_sold uuid;
    v_brahman_sold uuid;
    v_angus_sold uuid;
BEGIN
    SELECT id INTO v_pid FROM public.properties
     WHERE user_id = v_uid AND is_default = true AND is_deleted = false LIMIT 1;
    IF v_pid IS NULL THEN
        RAISE EXCEPTION 'Demo user has no default property - run seed_demo_data_tier1 first';
    END IF;

    SELECT id INTO v_main_breeders     FROM public.herds WHERE user_id=v_uid AND name='Main Breeders' AND is_deleted=false;
    SELECT id INTO v_first_calf        FROM public.herds WHERE user_id=v_uid AND name='First-Calf Heifers' AND is_deleted=false;
    SELECT id INTO v_wet_cows          FROM public.herds WHERE user_id=v_uid AND name='Wet Cows' AND is_deleted=false;
    SELECT id INTO v_hereford          FROM public.herds WHERE user_id=v_uid AND name='Hereford Breeders' AND is_deleted=false;
    SELECT id INTO v_weaner_heifers    FROM public.herds WHERE user_id=v_uid AND name='Weaner Heifers' AND is_deleted=false;
    SELECT id INTO v_yearling_heifers  FROM public.herds WHERE user_id=v_uid AND name='Yearling Heifers' AND is_deleted=false;
    SELECT id INTO v_weaner_steers     FROM public.herds WHERE user_id=v_uid AND name='Weaner Steers' AND is_deleted=false;
    SELECT id INTO v_yearling_steers   FROM public.herds WHERE user_id=v_uid AND name='Yearling Steers' AND is_deleted=false;
    SELECT id INTO v_feeder            FROM public.herds WHERE user_id=v_uid AND name='Feeder Steers' AND is_deleted=false;
    SELECT id INTO v_cull_cows         FROM public.herds WHERE user_id=v_uid AND name='Cull Cows' AND is_deleted=false;
    SELECT id INTO v_herd_bulls        FROM public.herds WHERE user_id=v_uid AND name='Herd Bulls' AND is_deleted=false;
    SELECT id INTO v_young_bulls       FROM public.herds WHERE user_id=v_uid AND name='Young Bulls' AND is_deleted=false;
    SELECT id INTO v_grown_sold        FROM public.herds WHERE user_id=v_uid AND name='Grown Steers (sold)' AND is_deleted=false;
    SELECT id INTO v_cull_bulls_sold   FROM public.herds WHERE user_id=v_uid AND name='Cull Bulls (sold)' AND is_deleted=false;
    SELECT id INTO v_brahman_sold      FROM public.herds WHERE user_id=v_uid AND name='Brahman Feeder Heifers (sold)' AND is_deleted=false;
    SELECT id INTO v_angus_sold        FROM public.herds WHERE user_id=v_uid AND name='Angus Yearling Steers (sold)' AND is_deleted=false;

    DELETE FROM public.sales_records  WHERE user_id = v_uid;
    DELETE FROM public.yard_book_items WHERE user_id = v_uid;
    DELETE FROM public.health_records WHERE user_id = v_uid;
    DELETE FROM public.muster_records WHERE user_id = v_uid;

    INSERT INTO public.sales_records (id, user_id, herd_id, sale_date, head_count, average_weight, price_per_kg, pricing_type, total_gross_value, freight_cost, freight_distance, net_value, sale_type, sale_location, notes) VALUES
    (gen_random_uuid(), v_uid, v_grown_sold,     now() - interval '240 days', 32, 520, 3.85, 'per_kg', 32*520*3.85, 1890, 270, 32*520*3.85 - 1890, 'Saleyard',     v_sy_gracemere, 'Sold at CQLX weekly sale. 32 head, avg 520kg.'),
    (gen_random_uuid(), v_uid, v_cull_bulls_sold, now() - interval '60 days',   5, 780, 2.90, 'per_kg',  5*780*2.90,  945, 270,  5*780*2.90 - 945, 'Saleyard',     v_sy_gracemere, 'Sold at CQLX weekly sale. 5 head, avg 780kg.'),
    (gen_random_uuid(), v_uid, v_brahman_sold,   now() - interval '130 days', 25, 370, 3.65, 'per_kg', 25*370*3.65,    0,   0, 25*370*3.65,      'Private Sale', 'Direct to feedlot buyer',   'Private sale, direct delivery. 25 head at $3.65/kg.'),
    (gen_random_uuid(), v_uid, v_angus_sold,     now() - interval '180 days', 48, 420, 4.20, 'per_kg', 48*420*4.20,    0,   0, 48*420*4.20,      'Private Sale', 'Doongara Station - paddock sale', 'Private sale, buyer collected. 48 head at $4.20/kg.');

    INSERT INTO public.yard_book_items (id, user_id, property_id, title, event_date, is_all_day, category_raw, is_completed, completed_date, is_recurring, recurrence_rule_raw, notifications_scheduled, notes, linked_herd_ids) VALUES
    (gen_random_uuid(), v_uid, v_pid, 'Weaner processing - brand, tag, vaccinate', now() - interval '42 days', true, 'Livestock', true, now() - interval '42 days', false, NULL, false, 'Full weaner processing. 70 steer + 65 heifer weaners branded, tagged, NLIS applied, 7-in-1 vaccinated.', ARRAY[v_weaner_heifers, v_weaner_steers]),
    (gen_random_uuid(), v_uid, v_pid, 'Pregnancy testing - Main Breeders',         now() - interval '14 days', true, 'Livestock', true, now() - interval '14 days', false, NULL, false, 'Vet confirmed 88% conception rate. 12 empties drafted for Gracemere.', ARRAY[v_main_breeders, v_first_calf]),
    (gen_random_uuid(), v_uid, v_pid, 'Cull cows to CQLX sale',                    now() + interval '7 days',  true, 'Livestock', false, NULL, false, NULL, false, '22 head cull cows. B-double booked with CQ Transport.', ARRAY[v_cull_cows]),
    (gen_random_uuid(), v_uid, v_pid, 'Transport weaners to Gracemere',            now() + interval '21 days', true, 'Livestock', false, NULL, false, NULL, false, 'B-double booked. 70 head weaner steers for CQLX feature sale.', ARRAY[v_weaner_steers]),
    (gen_random_uuid(), v_uid, v_pid, 'Feeder steers - weigh and assess',          now() + interval '14 days', true, 'Livestock', false, NULL, false, NULL, false, 'Weigh feeder steers on improved pasture. Target 420kg+ for processor grid.', ARRAY[v_feeder]),
    (gen_random_uuid(), v_uid, v_pid, 'BBSE - annual bull assessment',             now() - interval '90 days', true, 'Livestock', true, now() - interval '90 days', false, NULL, false, '8 working bulls passed BBSE. Dr Patterson, Emerald Vet Services.', ARRAY[v_herd_bulls, v_young_bulls]),
    (gen_random_uuid(), v_uid, v_pid, 'Annual vaccination - 5-in-1',               now() - interval '60 days', true, 'Operations', true, now() - interval '60 days', true, 'Annual', false, '5-in-1 Ultravac for all breeders and weaners. Completed by vet.', ARRAY[v_main_breeders]),
    (gen_random_uuid(), v_uid, v_pid, 'Drenching round - yearlings',                now() - interval '21 days', true, 'Operations', true, now() - interval '21 days', false, NULL, false, 'Ivomec Plus drench for yearling steers and heifers.', NULL),
    (gen_random_uuid(), v_uid, v_pid, 'Water infrastructure check',                now() + interval '5 days',  true, 'Operations', false, NULL, true, 'Monthly', false, 'Check bore pump, all troughs, and turkey nest dam levels.', NULL),
    (gen_random_uuid(), v_uid, v_pid, 'Paddock rotation - move yearlings',         now() + interval '10 days', true, 'Operations', false, NULL, true, 'Fortnightly', false, 'Rotate yearling steers from Top Paddock to Bore Paddock.', NULL),
    (gen_random_uuid(), v_uid, v_pid, 'BAS lodgement',                             now() + interval '30 days', true, 'Finance', false, NULL, true, 'Monthly', false, 'Quarterly BAS due. Send invoices to accountant.', NULL),
    (gen_random_uuid(), v_uid, v_pid, 'Livestock insurance renewal',               now() + interval '60 days', true, 'Finance', false, NULL, true, 'Annual', false, 'Review policy with broker. Update herd values from portfolio.', NULL),
    (gen_random_uuid(), v_uid, v_pid, 'School holidays start',                     now() + interval '25 days', true, 'Family', false, NULL, false, NULL, false, 'Kids home for 2 weeks. Plan station activities.', NULL),
    (gen_random_uuid(), v_uid, v_pid, 'Ag-Grow field day',                         now() + interval '42 days', true, 'Me', false, NULL, false, NULL, false, 'Annual Emerald Ag-Grow. Check new fencing equipment.', NULL);

    INSERT INTO public.health_records (id, user_id, herd_id, date, treatment_type_raw, notes) VALUES
    (gen_random_uuid(), v_uid, v_main_breeders,    now() - interval '60 days', 'Vaccination',        '5-in-1 Ultravac, 2ml subcutaneous. All 185 head processed through Home Yards.'),
    (gen_random_uuid(), v_uid, v_weaner_steers,    now() - interval '42 days', 'Vaccination',        '7-in-1 Websters, weaner dose 1ml. 70 head processed.'),
    (gen_random_uuid(), v_uid, v_weaner_heifers,   now() - interval '42 days', 'Vaccination',        '7-in-1 Websters, weaner dose 1ml. 65 head processed.'),
    (gen_random_uuid(), v_uid, v_hereford,         now() - interval '35 days', 'Vaccination',        '5-in-1 Ultravac for Hereford breeders. 90 head through River Yards.'),
    (gen_random_uuid(), v_uid, v_yearling_steers,  now() - interval '21 days', 'Drenching',          'Ivomec Plus drench, 10ml per 50kg body weight. 55 head.'),
    (gen_random_uuid(), v_uid, v_yearling_heifers, now() - interval '21 days', 'Drenching',          'Ivomec Plus drench, 10ml per 50kg body weight. 50 head.'),
    (gen_random_uuid(), v_uid, v_feeder,           now() - interval '14 days', 'Drenching',          'Dectomax injectable, 1ml per 50kg. 40 head at Hill Paddock.'),
    (gen_random_uuid(), v_uid, v_main_breeders,    now() - interval '45 days', 'Parasite Treatment', 'Acatak pour-on tick treatment. All breeders processed at Home Yards.'),
    (gen_random_uuid(), v_uid, v_main_breeders,    now() - interval '14 days', 'Other',              'Preg tested by Dr Patterson, Emerald Vet Services. 88% PTIC, 12 empties drafted.'),
    (gen_random_uuid(), v_uid, v_herd_bulls,       now() - interval '90 days', 'Other',              'Annual BBSE for 8 working bulls. All passed.');

    INSERT INTO public.muster_records (id, user_id, herd_id, date, total_head_count, weaners_count, branders_count, cattle_yard, notes) VALUES
    (gen_random_uuid(), v_uid, v_main_breeders,   now() - interval '30 days', 185, NULL, NULL, 'Home Yards',         'Annual muster, all head accounted for. Good condition scores across the board.'),
    (gen_random_uuid(), v_uid, v_weaner_steers,   now() - interval '42 days',  70, 70, 70, 'East Yards',          'Weaner draft completed. All branded and tagged. NLIS devices applied.'),
    (gen_random_uuid(), v_uid, v_weaner_heifers,  now() - interval '42 days',  65, 65, 65, 'East Yards',          'Heifer weaners processed same day. Vaccinated and drenched.'),
    (gen_random_uuid(), v_uid, v_yearling_steers, now() - interval '21 days',  55, NULL, NULL, 'Top Paddock Yards',   'Yearling steers mustered for drenching. Good weight gains observed.'),
    (gen_random_uuid(), v_uid, v_hereford,        now() - interval '35 days',  90, NULL, NULL, 'River Yards',         'Hereford breeders mustered for vaccination.'),
    (gen_random_uuid(), v_uid, v_cull_cows,       now() - interval '7 days',   22, NULL, NULL, 'Back Yards',          'Drafted cull cows for Gracemere sale. Trucking booked for next week.'),
    (gen_random_uuid(), v_uid, v_herd_bulls,      now() - interval '90 days',   8, NULL, NULL, 'Home Yards',          'Bulls mustered for annual BBSE.'),
    (gen_random_uuid(), v_uid, v_wet_cows,        now() - interval '45 days',  60, NULL, NULL, 'Creek Yards',         'Creek paddock muster. 54 calves at foot confirmed.'),
    (gen_random_uuid(), v_uid, v_feeder,          now() - interval '60 days',  40, NULL, NULL, 'Hill Paddock Yards',  'Feeder steers mustered for paddock move.');

    RAISE NOTICE 'Seeded demo user tier 2/3 data';
END $$;
