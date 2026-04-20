-- Market page aggregation RPCs.
--
-- Motivation: the /dashboard/market page was pulling 300k-500k raw rows from
-- category_prices per load (revalidate = 0), then aggregating weekly averages
-- client-side. These RPCs move aggregation into Postgres and return already-
-- summarised payloads (hundreds of rows instead of hundreds of thousands).
--
-- All RPCs assume species = 'cattle' since every MLA_CATEGORIES entry is
-- cattle-only. This also lets the planner hit idx_category_prices_species_state
-- cleanly. expires_at filter guards against aggregating stale rows.

-- ---------------------------------------------------------------------------
-- market_category_summaries
-- ---------------------------------------------------------------------------
-- One row per MLA category with latest weekly average, change%% vs prior weeks,
-- distinct saleyard count for the latest week, and a 12-week sparkline.
-- Replaces the 8-parallel-query getCategorySummaries() loop in _data.ts.
CREATE OR REPLACE FUNCTION public.market_category_summaries(
  p_state text DEFAULT NULL,
  p_days int DEFAULT 420
)
RETURNS TABLE (
  category text,
  latest_price double precision,
  latest_date date,
  change_1w_pct double precision,
  change_4w_pct double precision,
  change_12w_pct double precision,
  change_52w_pct double precision,
  saleyard_count int,
  sparkline jsonb
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH weekly AS (
    SELECT
      cp.category,
      cp.data_date,
      AVG(cp.final_price_per_kg) / 100.0 AS avg_price,
      COUNT(DISTINCT cp.saleyard)::int   AS saleyards,
      COUNT(*)::int                       AS sales
    FROM category_prices cp
    WHERE cp.species = 'Cattle'
      AND cp.data_date >= CURRENT_DATE - p_days
      AND (p_state IS NULL OR cp.state = p_state)
      AND (cp.expires_at IS NULL OR cp.expires_at > NOW())
    GROUP BY cp.category, cp.data_date
  ),
  ranked AS (
    SELECT
      w.*,
      ROW_NUMBER() OVER (PARTITION BY w.category ORDER BY w.data_date DESC) AS rn
    FROM weekly w
  ),
  latest AS (
    SELECT category, data_date AS latest_date, avg_price AS latest_price, saleyards AS saleyard_count
    FROM ranked WHERE rn = 1
  ),
  prev AS (
    SELECT
      category,
      MAX(CASE WHEN rn = 2  THEN avg_price END) AS p1,
      MAX(CASE WHEN rn = 5  THEN avg_price END) AS p4,
      MAX(CASE WHEN rn = 13 THEN avg_price END) AS p12,
      MAX(CASE WHEN rn = 53 THEN avg_price END) AS p52
    FROM ranked
    GROUP BY category
  ),
  spark AS (
    SELECT
      category,
      jsonb_agg(
        jsonb_build_object(
          'week_date', data_date,
          'avg_price', avg_price,
          'saleyards', saleyards,
          'sales',     sales
        )
        ORDER BY data_date
      ) AS sparkline
    FROM ranked
    WHERE rn <= 12
    GROUP BY category
  )
  SELECT
    l.category,
    l.latest_price,
    l.latest_date,
    CASE WHEN p.p1  > 0 THEN (l.latest_price - p.p1)  / p.p1  * 100 END AS change_1w_pct,
    CASE WHEN p.p4  > 0 THEN (l.latest_price - p.p4)  / p.p4  * 100 END AS change_4w_pct,
    CASE WHEN p.p12 > 0 THEN (l.latest_price - p.p12) / p.p12 * 100 END AS change_12w_pct,
    CASE WHEN p.p52 > 0 THEN (l.latest_price - p.p52) / p.p52 * 100 END AS change_52w_pct,
    l.saleyard_count,
    s.sparkline
  FROM latest l
  LEFT JOIN prev  p ON p.category = l.category
  LEFT JOIN spark s ON s.category = l.category
  ORDER BY l.category;
$$;

GRANT EXECUTE ON FUNCTION public.market_category_summaries(text, int) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- market_top_movers
-- ---------------------------------------------------------------------------
-- Top 5 gainers + top 5 losers across both categories and saleyards for a
-- rolling window. Single round-trip that replaces two getTopMovers() calls.
CREATE OR REPLACE FUNCTION public.market_top_movers(
  p_state text DEFAULT NULL,
  p_window_days int DEFAULT 7
)
RETURNS TABLE (
  kind text,
  name text,
  state text,
  latest_price double precision,
  change_pct double precision,
  gainer_rank int,
  loser_rank int
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH price_window AS (
    SELECT cp.category, cp.saleyard, cp.state, cp.data_date, cp.final_price_per_kg
    FROM category_prices cp
    WHERE cp.species = 'Cattle'
      AND cp.data_date >= CURRENT_DATE - (p_window_days + 14)
      AND (p_state IS NULL OR cp.state = p_state)
      AND (cp.expires_at IS NULL OR cp.expires_at > NOW())
  ),
  cat_daily AS (
    SELECT 'category'::text AS kind, category AS name, NULL::text AS state, data_date,
           AVG(final_price_per_kg) / 100.0 AS avg_price
    FROM price_window
    GROUP BY category, data_date
  ),
  yard_daily AS (
    SELECT 'saleyard'::text AS kind, saleyard AS name, MIN(state) AS state, data_date,
           AVG(final_price_per_kg) / 100.0 AS avg_price
    FROM price_window
    WHERE saleyard IS NOT NULL
    GROUP BY saleyard, data_date
  ),
  daily AS (
    SELECT * FROM cat_daily
    UNION ALL
    SELECT * FROM yard_daily
  ),
  ranked AS (
    SELECT
      d.*,
      ROW_NUMBER() OVER (PARTITION BY d.kind, d.name ORDER BY d.data_date DESC) AS rn
    FROM daily d
  ),
  latest AS (
    SELECT kind, name, state, data_date AS latest_date, avg_price AS latest_price
    FROM ranked WHERE rn = 1
  ),
  prior AS (
    SELECT DISTINCT ON (r.kind, r.name)
      r.kind, r.name, r.avg_price AS prior_price
    FROM ranked r
    JOIN latest l USING (kind, name)
    WHERE r.rn > 1
      AND (l.latest_date - r.data_date) >= (p_window_days - 3)
    ORDER BY r.kind, r.name, r.data_date DESC
  ),
  movers AS (
    SELECT
      l.kind, l.name, l.state, l.latest_price,
      (l.latest_price - p.prior_price) / p.prior_price * 100 AS change_pct
    FROM latest l
    JOIN prior  p USING (kind, name)
    WHERE p.prior_price > 0
  ),
  ranked_movers AS (
    SELECT
      m.*,
      ROW_NUMBER() OVER (ORDER BY m.change_pct DESC) AS g_rank,
      ROW_NUMBER() OVER (ORDER BY m.change_pct ASC)  AS l_rank
    FROM movers m
  )
  SELECT
    kind, name, state, latest_price, change_pct,
    CASE WHEN g_rank <= 5 THEN g_rank::int ELSE NULL END AS gainer_rank,
    CASE WHEN l_rank <= 5 THEN l_rank::int ELSE NULL END AS loser_rank
  FROM ranked_movers
  WHERE g_rank <= 5 OR l_rank <= 5
  ORDER BY change_pct DESC;
$$;

GRANT EXECUTE ON FUNCTION public.market_top_movers(text, int) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- market_yoy_weekly
-- ---------------------------------------------------------------------------
-- Year-over-year weekly averages indexed by (year, week-of-year 1-53).
-- Replaces the per-year paginating loops in getYearOverYearMonthly().
CREATE OR REPLACE FUNCTION public.market_yoy_weekly(
  p_state text DEFAULT NULL,
  p_years int DEFAULT 3
)
RETURNS TABLE (
  year int,
  week int,
  avg_price double precision
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    EXTRACT(YEAR FROM cp.data_date)::int AS year,
    LEAST(53, GREATEST(1,
      CEIL(EXTRACT(DOY FROM cp.data_date)::numeric / 7)::int
    ))::int AS week,
    AVG(cp.final_price_per_kg) / 100.0 AS avg_price
  FROM category_prices cp
  WHERE cp.species = 'Cattle'
    AND cp.data_date >= make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int - (p_years - 1), 1, 1)
    AND (p_state IS NULL OR cp.state = p_state)
    AND (cp.expires_at IS NULL OR cp.expires_at > NOW())
  GROUP BY 1, 2
  ORDER BY 1, 2;
$$;

GRANT EXECUTE ON FUNCTION public.market_yoy_weekly(text, int) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- market_category_timeline_weekly
-- ---------------------------------------------------------------------------
-- Weekly prices pivoted with one column per MLA category. Rolling window of
-- p_years. Feeds the MarketOverviewCard category-timeline chart.
CREATE OR REPLACE FUNCTION public.market_category_timeline_weekly(
  p_state text DEFAULT NULL,
  p_years int DEFAULT 2
)
RETURNS TABLE (
  week_date date,
  "Grown Steer"    double precision,
  "Grown Heifer"   double precision,
  "Grown Bull"     double precision,
  "Yearling Steer" double precision,
  "Yearling Heifer" double precision,
  "Weaner Steer"   double precision,
  "Heifer"         double precision,
  "Cows"           double precision
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    cp.data_date AS week_date,
    AVG(CASE WHEN cp.category = 'Grown Steer'     THEN cp.final_price_per_kg END) / 100.0 AS "Grown Steer",
    AVG(CASE WHEN cp.category = 'Grown Heifer'    THEN cp.final_price_per_kg END) / 100.0 AS "Grown Heifer",
    AVG(CASE WHEN cp.category = 'Grown Bull'      THEN cp.final_price_per_kg END) / 100.0 AS "Grown Bull",
    AVG(CASE WHEN cp.category = 'Yearling Steer'  THEN cp.final_price_per_kg END) / 100.0 AS "Yearling Steer",
    AVG(CASE WHEN cp.category = 'Yearling Heifer' THEN cp.final_price_per_kg END) / 100.0 AS "Yearling Heifer",
    AVG(CASE WHEN cp.category = 'Weaner Steer'    THEN cp.final_price_per_kg END) / 100.0 AS "Weaner Steer",
    AVG(CASE WHEN cp.category = 'Heifer'          THEN cp.final_price_per_kg END) / 100.0 AS "Heifer",
    AVG(CASE WHEN cp.category = 'Cows'            THEN cp.final_price_per_kg END) / 100.0 AS "Cows"
  FROM category_prices cp
  WHERE cp.species = 'Cattle'
    AND cp.data_date >= CURRENT_DATE - (p_years * 365)
    AND (p_state IS NULL OR cp.state = p_state)
    AND (cp.expires_at IS NULL OR cp.expires_at > NOW())
  GROUP BY cp.data_date
  ORDER BY cp.data_date;
$$;

GRANT EXECUTE ON FUNCTION public.market_category_timeline_weekly(text, int) TO anon, authenticated;
