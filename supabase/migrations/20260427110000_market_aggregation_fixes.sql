-- Market aggregation fixes (QA report MP-02 through MP-07).
--
-- Three RPCs are rewritten:
--   * market_top_movers          - was producing wrong directions and "7 day"
--                                   changes that were really 14 day comparisons.
--   * market_yoy_weekly          - 2024 line ran systematically low because the
--                                   2024 saleyard basket was wider than 2025/26.
--   * market_category_summaries  - Grown Heifer / Grown Steer prices and 1w
--                                   changes drifted because the simple row
--                                   average was sensitive to per-week category
--                                   mix and saleyard mix.
--
-- Common methodology change: aggregate to (saleyard, week) first, then average
-- saleyard prices to a category or yard headline. Each saleyard gets equal
-- weight regardless of how many rows it contributed. Without a head_count
-- column on category_prices we cannot true head-weight, but per-saleyard
-- averaging eliminates row-count bias and matches how the iOS app and MLA NLRS
-- present the same numbers.

-- ---------------------------------------------------------------------------
-- market_top_movers
-- ---------------------------------------------------------------------------
-- Returns top 5 gainers + top 5 losers across both categories and saleyards.
-- For categories: % change per (category, saleyard), averaged across the
-- saleyards that reported in BOTH the latest and prior weeks.
-- For saleyards:  % change per (saleyard, category), averaged across the
-- categories that reported in BOTH the latest and prior weeks.
-- Latest week is the most recent week with data. Prior week is the closest
-- week to latest - window_days, with a strict +/- 3 day tolerance. Entries
-- without a qualifying prior week are dropped (no more "-0.0%" filler).
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
    -- Pull a wide enough window that we can still find a prior week even when
    -- a yard skipped a sale. window_days + 14 covers a missed week + tolerance.
    SELECT cp.category, cp.saleyard, cp.state, cp.data_date, cp.final_price_per_kg
    FROM category_prices cp
    WHERE cp.species = 'Cattle'
      AND cp.saleyard IS NOT NULL
      AND cp.data_date >= CURRENT_DATE - (p_window_days + 14)
      AND (p_state IS NULL OR cp.state = p_state)
      AND (cp.expires_at IS NULL OR cp.expires_at > NOW())
  ),
  -- Per (saleyard, category, week) average. This is the unit of comparison;
  -- it removes within-week noise and lets us pair latest vs prior on the same
  -- (saleyard, category) basket.
  yard_cat_weekly AS (
    SELECT
      pw.saleyard,
      MIN(pw.state) AS state,
      pw.category,
      pw.data_date AS week_date,
      AVG(pw.final_price_per_kg) / 100.0 AS price
    FROM price_window pw
    GROUP BY pw.saleyard, pw.category, pw.data_date
  ),
  -- Latest week per (saleyard, category).
  latest_yc AS (
    SELECT DISTINCT ON (saleyard, category)
      saleyard, state, category, week_date AS latest_date, price AS latest_price
    FROM yard_cat_weekly
    ORDER BY saleyard, category, week_date DESC
  ),
  -- For each (saleyard, category) latest, find the prior week closest to
  -- latest - window_days within +/- 3 days. If none qualifies the row drops.
  prior_yc AS (
    SELECT DISTINCT ON (l.saleyard, l.category)
      l.saleyard, l.category, w.price AS prior_price
    FROM latest_yc l
    JOIN yard_cat_weekly w
      ON w.saleyard = l.saleyard
     AND w.category = l.category
     AND w.week_date < l.latest_date
     AND ABS((l.latest_date - w.week_date) - p_window_days) <= 3
    ORDER BY l.saleyard, l.category, ABS((l.latest_date - w.week_date) - p_window_days)
  ),
  -- Per (saleyard, category) % change over the window. Only pairs present at
  -- both endpoints survive, so a category mix flip can't swing the headline.
  yc_changes AS (
    SELECT
      l.saleyard,
      l.state,
      l.category,
      l.latest_price,
      (l.latest_price - p.prior_price) / p.prior_price * 100 AS change_pct
    FROM latest_yc l
    JOIN prior_yc p USING (saleyard, category)
    WHERE p.prior_price > 0
  ),
  -- Saleyard headline: average % change across categories present at both
  -- endpoints. Latest price = simple average of category latest prices.
  yard_movers AS (
    SELECT
      'saleyard'::text AS kind,
      saleyard AS name,
      MIN(state) AS state,
      AVG(latest_price) AS latest_price,
      AVG(change_pct)   AS change_pct,
      COUNT(*)::int     AS pair_count
    FROM yc_changes
    GROUP BY saleyard
    HAVING COUNT(*) >= 1
  ),
  -- Category headline: average % change across saleyards present at both
  -- endpoints.
  cat_movers AS (
    SELECT
      'category'::text AS kind,
      category AS name,
      NULL::text AS state,
      AVG(latest_price) AS latest_price,
      AVG(change_pct)   AS change_pct,
      COUNT(*)::int     AS pair_count
    FROM yc_changes
    GROUP BY category
    HAVING COUNT(*) >= 2 -- a single saleyard isn't a national signal
  ),
  movers AS (
    SELECT * FROM yard_movers
    UNION ALL
    SELECT * FROM cat_movers
  ),
  ranked_movers AS (
    SELECT
      m.*,
      ROW_NUMBER() OVER (ORDER BY m.change_pct DESC) AS g_rank,
      ROW_NUMBER() OVER (ORDER BY m.change_pct ASC)  AS l_rank
    FROM movers m
    -- Drop near-zero entries from the lists; they aren't movers.
    WHERE ABS(m.change_pct) >= 0.5
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
-- Restricts the saleyard basket to yards that reported in the most recent
-- year. Without this, 2024 ran systematically low because six lower-priced
-- yards (Emerald, Camperdown, Toowoomba, Pakenham, Oakey, Lismore) reported
-- in 2024 but dropped out in 2025/26, biasing the simple row average.
-- Within the consistent basket, we average per-saleyard weekly averages so
-- each yard contributes equally regardless of how many rows it produced.
-- True head-weighting still requires adding a head_count column to
-- category_prices, which is out of scope here.
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
  WITH window_rows AS (
    SELECT cp.saleyard, cp.data_date, cp.final_price_per_kg
    FROM category_prices cp
    WHERE cp.species = 'Cattle'
      AND cp.saleyard IS NOT NULL
      AND cp.data_date >= make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int - (p_years - 1), 1, 1)
      AND (p_state IS NULL OR cp.state = p_state)
      AND (cp.expires_at IS NULL OR cp.expires_at > NOW())
  ),
  -- Saleyards that reported in the most recent year. This is the basket every
  -- year is filtered against so the YoY lines compare like with like.
  basket AS (
    SELECT DISTINCT saleyard
    FROM window_rows
    WHERE EXTRACT(YEAR FROM data_date)::int = EXTRACT(YEAR FROM CURRENT_DATE)::int
  ),
  -- Per (saleyard, year, week) average price.
  yard_weekly AS (
    SELECT
      w.saleyard,
      EXTRACT(YEAR FROM w.data_date)::int AS year,
      LEAST(53, GREATEST(1,
        CEIL(EXTRACT(DOY FROM w.data_date)::numeric / 7)::int
      ))::int AS week,
      AVG(w.final_price_per_kg) / 100.0 AS yard_price
    FROM window_rows w
    JOIN basket b ON b.saleyard = w.saleyard
    GROUP BY w.saleyard, EXTRACT(YEAR FROM w.data_date), week
  )
  SELECT
    year,
    week,
    AVG(yard_price) AS avg_price
  FROM yard_weekly
  GROUP BY year, week
  ORDER BY year, week;
$$;

GRANT EXECUTE ON FUNCTION public.market_yoy_weekly(text, int) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- market_category_summaries
-- ---------------------------------------------------------------------------
-- One row per MLA category with latest weekly average, change% baselines, a
-- distinct saleyard count, and a 12-week sparkline. Switches from a flat row
-- average to a per-saleyard-then-average approach so each saleyard contributes
-- equally to the headline, regardless of how many sub-rows it produced. The
-- previous flat row average was sensitive to per-week category-mix and
-- saleyard-mix shifts; per-yard averaging removes both.
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
  WITH yard_weekly AS (
    -- Per (category, saleyard, week) average. Equal-weight per saleyard.
    SELECT
      cp.category,
      cp.saleyard,
      cp.data_date,
      AVG(cp.final_price_per_kg) / 100.0 AS yard_price
    FROM category_prices cp
    WHERE cp.species = 'Cattle'
      AND cp.saleyard IS NOT NULL
      AND cp.data_date >= CURRENT_DATE - p_days
      AND (p_state IS NULL OR cp.state = p_state)
      AND (cp.expires_at IS NULL OR cp.expires_at > NOW())
    GROUP BY cp.category, cp.saleyard, cp.data_date
  ),
  weekly AS (
    -- Roll up to (category, week): each yard equal weight.
    SELECT
      category,
      data_date,
      AVG(yard_price) AS avg_price,
      COUNT(DISTINCT saleyard)::int AS saleyards,
      COUNT(*)::int AS sales
    FROM yard_weekly
    GROUP BY category, data_date
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
