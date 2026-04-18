-- Moves admin access from a hardcoded email whitelist (lib/data/admin.ts)
-- to a user_profiles.is_admin column.
--
-- Why the trigger:
-- user_profiles already has an UPDATE policy that lets a user edit their
-- own row. Without a column-level gate, a signed-in user could flip
-- is_admin to true on themselves. The enforce_is_admin_immutable trigger
-- blocks any change to is_admin unless the caller is running as service
-- role. Service role writes (via the admin surface) are the only
-- legitimate way to grant or revoke admin.
--
-- Backfills the current 3 real admins (Leon, Mil, Luke).
-- 'producertest' is deliberately NOT backfilled - it was removed from
-- the whitelist earlier today.

-- =========================================================================
-- 1. Column
-- =========================================================================
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin
  ON user_profiles(user_id)
  WHERE is_admin = true;

-- =========================================================================
-- 2. Backfill current admins
-- =========================================================================
UPDATE user_profiles SET is_admin = true WHERE user_id IN (
  'adb1288c-b284-40fd-8470-0f5092a15e3c',  -- leon@stockmanswallet.com.au
  'c1e6e156-d59d-4a4b-9cf4-b80a1c6b4917',  -- mil@stockmanswallet.com.au
  '5f14563f-b87b-41e0-88f7-c97d070bdcab'   -- luke@stockmanswallet.com.au
);

-- =========================================================================
-- 3. Trigger: block non-service-role callers from changing is_admin
-- =========================================================================
CREATE OR REPLACE FUNCTION public.enforce_is_admin_immutable()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public, pg_temp
AS $$
DECLARE
  is_service_role BOOLEAN := (auth.jwt() ->> 'role') = 'service_role';
BEGIN
  IF is_service_role THEN
    RETURN NEW;
  END IF;
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'is_admin can only be changed by service role';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_is_admin_immutable ON user_profiles;
CREATE TRIGGER trg_enforce_is_admin_immutable
  BEFORE UPDATE OF is_admin ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_is_admin_immutable();
