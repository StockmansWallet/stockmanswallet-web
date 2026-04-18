-- Audit 2026-04-18 hygiene follow-up.
-- Covers the Medium/Low findings that weren't in the initial 20260418110000
-- hardening migration: advisor_scenarios policies, missing updated_at triggers,
-- partial indexes, range CHECK constraints, and search_path hardening on the
-- shared trigger function.
--
-- None of these are blocking today (advisor is feature-flagged off in MVP,
-- most hot queries already land on existing indexes). They close the gap so
-- re-enabling advisor later and adding new per-user data doesn't regress.

-- =========================================================================
-- 1. update_updated_at_column: pin search_path
-- =========================================================================
-- Shared trigger function used by several tables. Hardening to stop a caller
-- with a manipulated search_path resolving a malicious schema first.
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;

-- =========================================================================
-- 2. advisor_scenarios: restore policies + split advisor write / client read
-- =========================================================================
-- Mirrors the advisor_lenses split shipped in 20260418110000. The original
-- "Advisors can manage their own scenarios" policy from the table-create
-- migration disappeared somewhere between then and now (RLS still enabled,
-- zero policies). A table with RLS enabled and no policies denies every
-- non-superuser read and write, so the feature is effectively bricked
-- without this. Not a live issue because advisor is disabled in MVP.

DROP POLICY IF EXISTS "Advisors can manage their own scenarios" ON advisor_scenarios;
DROP POLICY IF EXISTS "Advisors write own scenarios" ON advisor_scenarios;
DROP POLICY IF EXISTS "Clients read scenarios via generated reports" ON advisor_scenarios;

CREATE POLICY "Advisors write own scenarios"
  ON advisor_scenarios FOR ALL
  TO authenticated
  USING (
    client_connection_id IN (
      SELECT id FROM connection_requests
      WHERE requester_user_id = auth.uid()
    )
  )
  WITH CHECK (
    client_connection_id IN (
      SELECT id FROM connection_requests
      WHERE requester_user_id = auth.uid()
    )
  );

CREATE POLICY "Clients read scenarios on approved connections"
  ON advisor_scenarios FOR SELECT
  TO authenticated
  USING (
    client_connection_id IN (
      SELECT id FROM connection_requests
      WHERE target_user_id = auth.uid()
        AND status = 'approved'
        AND permission_granted_at IS NOT NULL
        AND (permission_expires_at IS NULL OR permission_expires_at > now())
    )
  );

-- =========================================================================
-- 3. updated_at triggers on tables that carry the column but no trigger
-- =========================================================================
-- Every table that has an updated_at column needs the trigger, otherwise
-- any server action that forgets to set it silently leaves the column
-- stale - and the iOS sync engine relies on updated_at for conflict
-- resolution. advisor_lenses, advisor_scenarios, lens_reports, processors,
-- portfolio_snapshots are all missing the trigger today.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'advisor_lenses',
    'advisor_scenarios',
    'lens_reports',
    'processors',
    'portfolio_snapshots'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = t
        AND column_name = 'updated_at'
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
      EXECUTE format(
        'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
        t
      );
    END IF;
  END LOOP;
END $$;

-- =========================================================================
-- 4. Partial indexes on soft-deleted tables
-- =========================================================================
-- Every hot query against these tables appends WHERE is_deleted = false.
-- A partial index matching that predicate avoids scanning tombstoned rows
-- and keeps the index a fraction of the size vs a full b-tree on user_id.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'herds',
    'properties',
    'sales_records',
    'muster_records',
    'health_records',
    'kill_sheet_records',
    'yard_book_items',
    'saved_freight_estimates',
    'custom_sale_locations',
    'consignments',
    'processors',
    'processor_grids',
    'grid_iq_analyses'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = t
        AND column_name = 'is_deleted'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = t
        AND column_name = 'user_id'
    ) THEN
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%I_user_active ON public.%I(user_id) WHERE is_deleted = false',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- =========================================================================
-- 5. Range CHECK constraints on key numeric columns
-- =========================================================================
-- Defence in depth against client bugs or hand-crafted inserts. The
-- constraints are conservative - they only reject values that are
-- definitely wrong (negatives on counts/weights/prices, percentages
-- outside 0-100).

DO $$
BEGIN
  -- herds: head_count already added in 20260418110000. Add remaining.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'herds_initial_weight_nonneg') THEN
    ALTER TABLE herds ADD CONSTRAINT herds_initial_weight_nonneg
      CHECK (initial_weight IS NULL OR initial_weight >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'herds_current_weight_nonneg') THEN
    ALTER TABLE herds ADD CONSTRAINT herds_current_weight_nonneg
      CHECK (current_weight IS NULL OR current_weight >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'herds_age_months_nonneg') THEN
    ALTER TABLE herds ADD CONSTRAINT herds_age_months_nonneg
      CHECK (age_months IS NULL OR age_months >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'herds_calving_rate_range') THEN
    -- calving_rate is stored as decimal 0-1 OR percentage 0-100 depending on column semantics.
    -- Defensive upper bound of 200 covers both.
    ALTER TABLE herds ADD CONSTRAINT herds_calving_rate_range
      CHECK (calving_rate IS NULL OR (calving_rate >= 0 AND calving_rate <= 200));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_records_head_count_nonneg') THEN
    ALTER TABLE sales_records ADD CONSTRAINT sales_records_head_count_nonneg
      CHECK (head_count IS NULL OR head_count >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_records_price_nonneg') THEN
    ALTER TABLE sales_records ADD CONSTRAINT sales_records_price_nonneg
      CHECK (price_per_kg IS NULL OR price_per_kg >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consignments_head_count_nonneg') THEN
    ALTER TABLE consignments ADD CONSTRAINT consignments_head_count_nonneg
      CHECK (total_head_count IS NULL OR total_head_count >= 0);
  END IF;
END $$;

-- advisor_lenses shading_percentage (0..200 to allow uplift beyond 100).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'advisor_lenses' AND column_name = 'shading_percentage'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'advisor_lenses_shading_range'
  ) THEN
    ALTER TABLE advisor_lenses ADD CONSTRAINT advisor_lenses_shading_range
      CHECK (shading_percentage IS NULL OR (shading_percentage >= 0 AND shading_percentage <= 200));
  END IF;
END $$;
