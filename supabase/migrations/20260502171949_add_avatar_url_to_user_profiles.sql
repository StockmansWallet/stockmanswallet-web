-- ============================================================================
-- Mirror auth.users.raw_user_meta_data.avatar_url into public.user_profiles
--
-- Context: Avatar URLs live in auth.users.raw_user_meta_data, which RLS-scoped
-- clients can't read. The Ch 40 hub today fetches profile rows in one query
-- and then makes a second call to the get-chat-participant-avatars Edge
-- Function to resolve avatar URLs. The two-phase fetch causes a visible flash
-- of initials before the photo arrives.
--
-- This migration mirrors the URL into a new user_profiles.avatar_url column so
-- the existing user_profiles SELECT query returns the avatar in one round trip.
-- The existing "Read discoverable profiles or own / approved peer" RLS policy
-- already gates user_profiles SELECT correctly; avatar_url inherits it.
--
-- Three pieces:
--   1. Column on user_profiles.
--   2. Backfill from auth.users for every existing profile row.
--   3. Two triggers that keep the column in sync going forward:
--      a) AFTER INSERT OR UPDATE ON auth.users mirrors metadata changes into
--         user_profiles when the row exists.
--      b) BEFORE INSERT ON user_profiles back-fills avatar_url from
--         auth.users for newly-created profile rows during onboarding.
--
-- Trigger functions are SECURITY DEFINER so they can read auth.users from
-- a non-privileged session (sign-up flow, profile creation from the iOS
-- onboarding). search_path is pinned to defeat search-path injection.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Column
-- --------------------------------------------------------------------------
ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS avatar_url text NULL;

COMMENT ON COLUMN public.user_profiles.avatar_url IS
    'Mirror of auth.users.raw_user_meta_data->>''avatar_url''. '
    'Maintained by sync_avatar_url_from_auth_users and '
    'populate_avatar_url_on_profile_insert triggers. Do not write directly '
    'from clients - update auth metadata via supabase.auth.update() and the '
    'trigger will propagate.';

-- --------------------------------------------------------------------------
-- 2. Backfill existing rows
-- Picks avatar_url first, falls back to google_avatar_url so Google-OAuth
-- users with no custom upload still get their Google photo mirrored.
-- --------------------------------------------------------------------------
UPDATE public.user_profiles up
   SET avatar_url = COALESCE(
        NULLIF(au.raw_user_meta_data->>'avatar_url', ''),
        NULLIF(au.raw_user_meta_data->>'google_avatar_url', '')
   )
  FROM auth.users au
 WHERE au.id = up.user_id
   AND up.avatar_url IS DISTINCT FROM COALESCE(
        NULLIF(au.raw_user_meta_data->>'avatar_url', ''),
        NULLIF(au.raw_user_meta_data->>'google_avatar_url', '')
   );

-- --------------------------------------------------------------------------
-- 3a. Trigger: keep user_profiles.avatar_url in sync when auth metadata
-- changes (avatar upload, sign-in via OAuth that refreshes the photo, etc.).
-- No-ops when the matching user_profiles row does not exist yet - the
-- onboarding flow creates the row later, and trigger 3b handles that case.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_avatar_url_from_auth_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_new_url text;
    v_old_url text;
BEGIN
    v_new_url := COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
        NULLIF(NEW.raw_user_meta_data->>'google_avatar_url', '')
    );

    IF TG_OP = 'UPDATE' THEN
        v_old_url := COALESCE(
            NULLIF(OLD.raw_user_meta_data->>'avatar_url', ''),
            NULLIF(OLD.raw_user_meta_data->>'google_avatar_url', '')
        );
        -- Skip the UPDATE when the resolved URL did not change.
        -- raw_user_meta_data churns on every sign-in for unrelated reasons
        -- (last_sign_in_at, providers list); we only care about avatar churn.
        IF v_new_url IS NOT DISTINCT FROM v_old_url THEN
            RETURN NEW;
        END IF;
    END IF;

    UPDATE public.user_profiles
       SET avatar_url = v_new_url
     WHERE user_id = NEW.id
       AND avatar_url IS DISTINCT FROM v_new_url;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_avatar_url_from_auth_users ON auth.users;
CREATE TRIGGER sync_avatar_url_from_auth_users
    AFTER INSERT OR UPDATE OF raw_user_meta_data ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.sync_avatar_url_from_auth_users();

-- --------------------------------------------------------------------------
-- 3b. Trigger: when a user_profiles row is first created (iOS onboarding
-- inserts after sign-up), back-fill avatar_url from auth.users so the field
-- is correct from the very first SELECT, without requiring the iOS client
-- to know about the column.
-- Only fires when the INSERT did not supply an avatar_url itself, so an
-- explicit value from a future client always wins over the mirror.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.populate_avatar_url_on_profile_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF NEW.avatar_url IS NULL OR NEW.avatar_url = '' THEN
        SELECT COALESCE(
                NULLIF(au.raw_user_meta_data->>'avatar_url', ''),
                NULLIF(au.raw_user_meta_data->>'google_avatar_url', '')
            )
          INTO NEW.avatar_url
          FROM auth.users au
         WHERE au.id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS populate_avatar_url_on_profile_insert ON public.user_profiles;
CREATE TRIGGER populate_avatar_url_on_profile_insert
    BEFORE INSERT ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.populate_avatar_url_on_profile_insert();
