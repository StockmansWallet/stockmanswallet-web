-- Optimize saleyard_stats RPC which times out on 344k+ row category_prices table.
-- The GROUP BY saleyard with multiple array_agg(DISTINCT ...) is too slow without
-- a saleyard-leading index.

-- 1. Add index to support the saleyard_stats aggregation query
CREATE INDEX IF NOT EXISTS idx_category_prices_saleyard_date
    ON category_prices(saleyard, data_date DESC);

-- 2. Rewrite function with a higher statement timeout via SET
CREATE OR REPLACE FUNCTION saleyard_stats(since_date DATE DEFAULT NULL)
RETURNS TABLE(
    saleyard TEXT,
    entry_count BIGINT,
    newest_date TEXT,
    oldest_date TEXT,
    categories TEXT[],
    breeds TEXT[],
    weight_ranges TEXT[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET statement_timeout = '30s'
AS $$
    SELECT
        cp.saleyard,
        count(*)::bigint AS entry_count,
        max(cp.data_date) AS newest_date,
        min(cp.data_date) AS oldest_date,
        array_agg(DISTINCT cp.category ORDER BY cp.category) AS categories,
        array_agg(DISTINCT cp.breed ORDER BY cp.breed) FILTER (WHERE cp.breed IS NOT NULL) AS breeds,
        array_agg(DISTINCT cp.weight_range ORDER BY cp.weight_range) FILTER (WHERE cp.weight_range IS NOT NULL) AS weight_ranges
    FROM category_prices cp
    WHERE cp.saleyard <> 'National'
      AND (since_date IS NULL OR cp.data_date >= since_date)
    GROUP BY cp.saleyard
    ORDER BY cp.saleyard;
$$;
