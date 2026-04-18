-- Returns only the newest date's price rows for each saleyard+category combo.
-- This avoids the 50k PostgREST row limit that truncates multi-saleyard queries
-- when the full history is fetched. The valuation engine only uses the newest date's
-- entries per saleyard/category, so older data is wasted bandwidth.
--
-- Parameters:
--   p_saleyards: array of saleyard names to include (plus 'National' is always included)
--   p_categories: array of MLA category names to filter by
--
-- Returns one row per (saleyard, category, weight_range, breed, data_date) at the
-- newest data_date for that saleyard+category pair.

CREATE OR REPLACE FUNCTION latest_saleyard_prices(
    p_saleyards TEXT[],
    p_categories TEXT[]
)
RETURNS TABLE(
    category TEXT,
    price_per_kg DOUBLE PRECISION,
    weight_range TEXT,
    saleyard TEXT,
    breed TEXT,
    data_date DATE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET statement_timeout = '15s'
AS $$
    -- Step 1: Find the newest data_date per saleyard+category
    WITH newest_dates AS (
        SELECT cp.saleyard, cp.category, max(cp.data_date) AS max_date
        FROM category_prices cp
        WHERE cp.saleyard = ANY(p_saleyards || ARRAY['National'])
          AND cp.category = ANY(p_categories)
        GROUP BY cp.saleyard, cp.category
    )
    -- Step 2: Return all rows at that newest date (all weight ranges, breeds)
    SELECT
        cp.category,
        cp.final_price_per_kg AS price_per_kg,
        cp.weight_range,
        cp.saleyard,
        cp.breed,
        cp.data_date
    FROM category_prices cp
    JOIN newest_dates nd
        ON cp.saleyard = nd.saleyard
       AND cp.category = nd.category
       AND cp.data_date = nd.max_date
    WHERE cp.saleyard = ANY(p_saleyards || ARRAY['National'])
      AND cp.category = ANY(p_categories)
    ORDER BY cp.saleyard, cp.category, cp.weight_range, cp.breed NULLS FIRST;
$$;
