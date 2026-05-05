-- One-off backfill for the demo producer john@redriverdowns.com.au.
--
-- His herds were seeded directly into Supabase via the Management API after
-- migration 20260317100002 had already converted production data to the
-- master-category taxonomy, so the seed strings (Yearling Steer, Breeder Cow,
-- Cull Cow, etc.) bypassed the migration and broke the dashboard donut, the
-- valuation engine's category resolution, and saleyard price lookups.
--
-- This script:
--   1. Maps `category` to master values (Steer/Heifer/Breeder/Dry Cow/Bull)
--      and sets `breeder_sub_type` for cow rows. Mirrors the UPDATE block in
--      migration 20260317100002_herds_category_columns.sql.
--   2. Derives `sub_category` (Weaner/Yearling/Grown/Cow/Cows) from
--      `current_weight` per defaultMappingRules in lib/data/weight-mapping.ts.
--
-- Idempotent: re-running is a no-op once master values are in place.

DO $$
DECLARE
    v_uid uuid := 'f920dc01-61f3-4952-b051-74ac32b4867c';
BEGIN
    UPDATE public.herds SET category = 'Steer'
     WHERE user_id = v_uid
       AND category IN ('Weaner Steer','Yearling Steer','Feeder Steer','Grown Steer');

    UPDATE public.herds SET category = 'Heifer'
     WHERE user_id = v_uid
       AND category IN ('Weaner Heifer','Yearling Heifer','Feeder Heifer','Grown Heifer (Un-Joined)');

    UPDATE public.herds SET category = 'Breeder', breeder_sub_type = 'Cow'
     WHERE user_id = v_uid
       AND category IN ('Breeder Cow','Wet Cow');

    UPDATE public.herds SET category = 'Breeder', breeder_sub_type = 'Heifer'
     WHERE user_id = v_uid
       AND category = 'Breeder Heifer';

    UPDATE public.herds SET category = 'Dry Cow'
     WHERE user_id = v_uid
       AND category = 'Cull Cow';

    UPDATE public.herds SET category = 'Bull'
     WHERE user_id = v_uid
       AND category IN ('Weaner Bull','Yearling Bull','Grown Bull','Cull Bull');

    UPDATE public.herds SET sub_category = CASE
        WHEN category = 'Steer'  AND current_weight < 330 THEN 'Weaner'
        WHEN category = 'Steer'  AND current_weight < 500 THEN 'Yearling'
        WHEN category = 'Steer'                            THEN 'Grown'
        WHEN category = 'Heifer' AND current_weight < 300 THEN 'Weaner'
        WHEN category = 'Heifer' AND current_weight < 450 THEN 'Yearling'
        WHEN category = 'Heifer'                           THEN 'Grown'
        WHEN category = 'Bull'   AND current_weight < 330 THEN 'Weaner'
        WHEN category = 'Bull'   AND current_weight < 550 THEN 'Yearling'
        WHEN category = 'Bull'                             THEN 'Grown'
        WHEN category = 'Breeder'                          THEN breeder_sub_type
        WHEN category = 'Dry Cow'                          THEN 'Cows'
        ELSE sub_category
    END
    WHERE user_id = v_uid;
END $$;
