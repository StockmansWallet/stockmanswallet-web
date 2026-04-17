-- Audit 2026-04-18: Security hardening migration
-- Addresses every Critical and High finding in section 3.1 of AUDIT-2026-04-18.md.
-- Safe to re-run: all CREATE POLICY statements are preceded by DROP POLICY IF EXISTS.

-- =========================================================================
-- 1. connection_requests: lock status on INSERT, lock identity on UPDATE
-- =========================================================================
-- Prevents an authenticated user from inserting a row with status='approved'
-- and permission_granted_at=now() to self-grant an advisor connection.
DROP POLICY IF EXISTS "Insert own requests" ON connection_requests;
CREATE POLICY "Insert own requests"
  ON connection_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    requester_user_id = auth.uid()
    AND status = 'pending'
    AND permission_granted_at IS NULL
    AND permission_expires_at IS NULL
  );

-- Restore the original (lenient) update policies on both sides. The privilege
-- escalation path is plugged by a BEFORE UPDATE trigger below, which is the
-- only place we can compare NEW vs OLD row values.
DROP POLICY IF EXISTS "Requester can update own requests" ON connection_requests;
CREATE POLICY "Requester can update own requests"
  ON connection_requests FOR UPDATE
  TO authenticated
  USING (requester_user_id = auth.uid())
  WITH CHECK (requester_user_id = auth.uid());

DROP POLICY IF EXISTS "Update requests targeting self" ON connection_requests;
CREATE POLICY "Update requests targeting self"
  ON connection_requests FOR UPDATE
  TO authenticated
  USING (target_user_id = auth.uid())
  WITH CHECK (target_user_id = auth.uid());

-- BEFORE UPDATE trigger: enforces that only the target can approve a
-- connection or set permission_granted_at. Requester can disconnect or
-- re-request but can never mint their own approval.
CREATE OR REPLACE FUNCTION public.enforce_connection_request_transitions()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public, pg_temp
AS $$
DECLARE
  caller UUID := auth.uid();
  is_service_role BOOLEAN := (auth.jwt() ->> 'role') = 'service_role';
BEGIN
  -- Service role bypasses the check (used by admin tooling and edge functions).
  IF is_service_role THEN
    RETURN NEW;
  END IF;

  -- Only the target can approve, only the target can mint permission_granted_at
  -- or extend permission_expires_at.
  IF caller = NEW.requester_user_id AND caller <> NEW.target_user_id THEN
    IF NEW.status = 'approved' AND COALESCE(OLD.status, '') <> 'approved' THEN
      RAISE EXCEPTION 'Requester cannot approve their own connection request';
    END IF;
    IF NEW.permission_granted_at IS DISTINCT FROM OLD.permission_granted_at
       AND OLD.permission_granted_at IS NULL THEN
      RAISE EXCEPTION 'Requester cannot set permission_granted_at';
    END IF;
    IF NEW.permission_expires_at IS DISTINCT FROM OLD.permission_expires_at
       AND (NEW.permission_expires_at IS NULL
            OR OLD.permission_expires_at IS NULL
            OR NEW.permission_expires_at > OLD.permission_expires_at) THEN
      -- Requester may shorten (to now()) when disconnecting, but not extend
      -- or clear a permission that the target set.
      IF NEW.status NOT IN ('removed', 'expired', 'denied') THEN
        RAISE EXCEPTION 'Requester cannot extend or clear permission_expires_at';
      END IF;
    END IF;
  END IF;

  -- Identity columns must never change.
  IF NEW.requester_user_id <> OLD.requester_user_id
     OR NEW.target_user_id <> OLD.target_user_id THEN
    RAISE EXCEPTION 'Cannot change requester_user_id or target_user_id';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_connection_request_transitions ON connection_requests;
CREATE TRIGGER trg_enforce_connection_request_transitions
  BEFORE UPDATE ON connection_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_connection_request_transitions();

-- =========================================================================
-- 2. waitlist: SELECT and DELETE were wide open to every authenticated user
-- =========================================================================
DROP POLICY IF EXISTS "Authenticated users can read waitlist" ON waitlist;
DROP POLICY IF EXISTS "Authenticated users can delete from waitlist" ON waitlist;
-- INSERT stays open (anonymous signup). Service role already has full access.
-- Reads and deletes are now service-role only (admin console uses service role).

-- =========================================================================
-- 3. get_advisor_connections: null-out PII columns for pending/expired rows
-- =========================================================================
-- Return shape is unchanged (iOS AdvisorConnectionRow Codable + web caller both rely on it).
-- Pending connections now expose only display_name. Approved-but-expired rows are
-- treated as pending. Property PII is further gated on sharing_permissions.property.
CREATE OR REPLACE FUNCTION public.get_advisor_connections()
  RETURNS TABLE(
    connection_id UUID,
    target_user_id UUID,
    status TEXT,
    permission_granted_at TIMESTAMPTZ,
    connection_type TEXT,
    sharing_permissions JSONB,
    created_at TIMESTAMPTZ,
    client_display_name TEXT,
    client_company_name TEXT,
    client_state TEXT,
    client_region TEXT,
    client_property_name TEXT,
    client_lga TEXT
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
DECLARE
  caller UUID := auth.uid();
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      cr.id AS connection_id,
      CASE WHEN cr.requester_user_id = caller
           THEN cr.target_user_id
           ELSE cr.requester_user_id
      END AS other_user_id,
      cr.status,
      cr.permission_granted_at,
      cr.connection_type,
      cr.sharing_permissions,
      cr.created_at,
      (cr.status = 'approved'
        AND cr.permission_granted_at IS NOT NULL
        AND (cr.permission_expires_at IS NULL OR cr.permission_expires_at > now())) AS is_active,
      COALESCE((cr.sharing_permissions->>'property')::boolean, false) AS share_property
    FROM connection_requests cr
    WHERE (cr.requester_user_id = caller OR cr.target_user_id = caller)
      AND cr.status IN ('pending', 'approved')
  )
  SELECT
    b.connection_id,
    b.other_user_id,
    b.status,
    b.permission_granted_at,
    b.connection_type,
    b.sharing_permissions,
    b.created_at,
    up.display_name,
    CASE WHEN b.is_active THEN up.company_name ELSE NULL END,
    CASE WHEN b.is_active THEN up.state ELSE NULL END,
    CASE WHEN b.is_active THEN up.region ELSE NULL END,
    CASE WHEN b.is_active AND b.share_property THEN p.property_name ELSE NULL END,
    CASE WHEN b.is_active AND b.share_property THEN p.lga ELSE NULL END
  FROM base b
  LEFT JOIN user_profiles up ON up.user_id = b.other_user_id
  LEFT JOIN properties p
    ON p.user_id = b.other_user_id
    AND p.is_default = true
    AND p.is_deleted = false;
END;
$$;

-- =========================================================================
-- 4. get_client_herds_for_advisor: expiry + sharing flag + search_path
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_client_herds_for_advisor(p_client_user_id UUID)
  RETURNS SETOF herds
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM connection_requests
    WHERE requester_user_id = auth.uid()
      AND target_user_id = p_client_user_id
      AND status = 'approved'
      AND permission_granted_at IS NOT NULL
      AND (permission_expires_at IS NULL OR permission_expires_at > now())
      AND COALESCE((sharing_permissions->>'herds')::boolean, false) = true
  ) THEN
    RAISE EXCEPTION 'No active herd-sharing permission for this client';
  END IF;

  RETURN QUERY
  SELECT *
  FROM herds
  WHERE user_id = p_client_user_id
    AND is_deleted = false
    AND (is_demo_data IS NULL OR is_demo_data = false)
  ORDER BY name;
END;
$$;

-- =========================================================================
-- 5. lens_reports: advisor writes only; client reads only when generated
-- =========================================================================
-- The existing "Advisors manage own lens reports" FOR ALL policy let the
-- client (target) delete advisor drafts. Replace with split policies.
DROP POLICY IF EXISTS "Advisors manage own lens reports" ON lens_reports;
DROP POLICY IF EXISTS "Advisors write own lens reports" ON lens_reports;
DROP POLICY IF EXISTS "Clients read generated lens reports" ON lens_reports;

CREATE POLICY "Advisors write own lens reports"
  ON lens_reports FOR ALL
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

CREATE POLICY "Clients read generated lens reports"
  ON lens_reports FOR SELECT
  TO authenticated
  USING (
    status = 'report_generated'
    AND client_connection_id IN (
      SELECT id FROM connection_requests
      WHERE target_user_id = auth.uid()
        AND status = 'approved'
        AND permission_granted_at IS NOT NULL
        AND (permission_expires_at IS NULL OR permission_expires_at > now())
    )
  );

-- =========================================================================
-- 6. advisor_lenses: advisor writes only; client reads when report shared
-- =========================================================================
DROP POLICY IF EXISTS "Advisors manage own lenses" ON advisor_lenses;
DROP POLICY IF EXISTS "Advisors write own lenses" ON advisor_lenses;
DROP POLICY IF EXISTS "Clients read lenses via generated reports" ON advisor_lenses;

CREATE POLICY "Advisors write own lenses"
  ON advisor_lenses FOR ALL
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

CREATE POLICY "Clients read lenses via generated reports"
  ON advisor_lenses FOR SELECT
  TO authenticated
  USING (
    client_connection_id IN (
      SELECT id FROM connection_requests
      WHERE target_user_id = auth.uid()
        AND status = 'approved'
        AND permission_granted_at IS NOT NULL
        AND (permission_expires_at IS NULL OR permission_expires_at > now())
    )
    AND (
      lens_report_id IS NULL
      OR lens_report_id IN (
        SELECT id FROM lens_reports WHERE status = 'report_generated'
      )
    )
  );

-- =========================================================================
-- 7. portfolio_snapshots: add DELETE policy and WITH CHECK on UPDATE
-- =========================================================================
DROP POLICY IF EXISTS "Users can update own snapshots" ON portfolio_snapshots;
CREATE POLICY "Users can update own snapshots"
  ON portfolio_snapshots FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own snapshots" ON portfolio_snapshots;
CREATE POLICY "Users can delete own snapshots"
  ON portfolio_snapshots FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =========================================================================
-- 8. SECURITY DEFINER: harden remaining functions with explicit search_path
-- =========================================================================
ALTER FUNCTION public.check_and_increment_usage(UUID, TEXT, INTEGER)
  SET search_path = public, pg_temp;

-- update_updated_at trigger function: SECURITY INVOKER but still benefits from pinned path.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at') THEN
    EXECUTE 'ALTER FUNCTION public.update_updated_at() SET search_path = public, pg_temp';
  END IF;
END $$;

-- =========================================================================
-- 9. processors: drop hard-delete policy (soft delete via is_deleted column)
-- =========================================================================
DROP POLICY IF EXISTS "users_own_processors_delete" ON processors;

-- =========================================================================
-- 10. Cross-table ownership: processor_id must belong to same user
-- =========================================================================
-- Covers grid_iq_analyses.processor_id, kill_sheet_records.processor_id,
-- processor_grids.processor_id, consignments.processor_id (SET NULL on delete).
CREATE OR REPLACE FUNCTION public.enforce_processor_owner()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.processor_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM processors
      WHERE id = NEW.processor_id
        AND user_id = NEW.user_id
        AND is_deleted = false
    ) THEN
      RAISE EXCEPTION 'processor_id % does not belong to user %', NEW.processor_id, NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['grid_iq_analyses','kill_sheet_records','processor_grids','consignments'] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = t
        AND column_name = 'processor_id'
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_enforce_processor_owner ON public.%I', t);
      EXECUTE format(
        'CREATE TRIGGER trg_enforce_processor_owner BEFORE INSERT OR UPDATE OF processor_id ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_processor_owner()',
        t
      );
    END IF;
  END LOOP;
END $$;

-- =========================================================================
-- 11. advisor_lenses.herd_id: enforce same-client ownership
-- =========================================================================
CREATE OR REPLACE FUNCTION public.enforce_lens_herd_owner()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
DECLARE
  client_id UUID;
BEGIN
  IF NEW.herd_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT target_user_id INTO client_id
  FROM connection_requests
  WHERE id = NEW.client_connection_id;

  IF client_id IS NULL THEN
    RAISE EXCEPTION 'connection_requests % not found', NEW.client_connection_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM herds
    WHERE id = NEW.herd_id
      AND user_id = client_id
      AND is_deleted = false
  ) THEN
    RAISE EXCEPTION 'herd_id % does not belong to client %', NEW.herd_id, client_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_lens_herd_owner ON advisor_lenses;
CREATE TRIGGER trg_enforce_lens_herd_owner
  BEFORE INSERT OR UPDATE OF herd_id ON advisor_lenses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_lens_herd_owner();

-- =========================================================================
-- 12. Range CHECK constraints on key numeric columns
-- =========================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'herds_head_count_nonneg') THEN
    ALTER TABLE herds ADD CONSTRAINT herds_head_count_nonneg CHECK (head_count IS NULL OR head_count >= 0);
  END IF;
END $$;

-- =========================================================================
-- End of audit hardening migration.
-- =========================================================================
