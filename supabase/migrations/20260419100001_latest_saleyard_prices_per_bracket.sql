-- Fix: latest_saleyard_prices was collapsing brackets that had different MLA report dates.
--
-- Previous behaviour grouped by (saleyard, category), so the RPC returned rows only at
-- MAX(data_date) per (saleyard, category). When a saleyard's weight brackets carried
-- different latest dates (e.g. CQLX Gracemere Bulls 0-450 reported 12/04, Bulls 450-600
-- reported 05/04), every bracket older than the single newest date was silently dropped
-- at the database. A 500 kg bull then had no 450-600 bracket to match and clamped into
-- the 0-450 bucket at the wrong price ($2.37 vs $3.10).
--
-- New behaviour groups by (saleyard, category, weight_range) so each bracket returns its
-- own newest row. The 56-day staleness guard on the client still retires genuinely old
-- data at the saleyard level.
--
-- Parameters unchanged. Return shape unchanged.
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
    -- Step 1: Find the newest data_date per saleyard+category+weight_range.
    -- weight_range can be NULL for any-weight categories (e.g. Cows), so we
    -- include it in the grouping knowing GROUP BY treats NULL as its own group.
    WITH newest_dates AS (
        SELECT cp.saleyard, cp.category, cp.weight_range, max(cp.data_date) AS max_date
        FROM category_prices cp
        WHERE cp.saleyard = ANY(p_saleyards || ARRAY['National'])
          AND cp.category = ANY(p_categories)
        GROUP BY cp.saleyard, cp.category, cp.weight_range
    )
    -- Step 2: Return all rows at that newest date for each bracket (all breeds).
    -- IS NOT DISTINCT FROM lets the join match NULL weight_range to NULL correctly.
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
       AND cp.weight_range IS NOT DISTINCT FROM nd.weight_range
       AND cp.data_date = nd.max_date
    WHERE cp.saleyard = ANY(p_saleyards || ARRAY['National'])
      AND cp.category = ANY(p_categories)
    ORDER BY cp.saleyard, cp.category, cp.weight_range NULLS FIRST, cp.breed NULLS FIRST;
$$;
