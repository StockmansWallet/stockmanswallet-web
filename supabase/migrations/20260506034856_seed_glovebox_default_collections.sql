-- Seed the starter Glovebox collections as normal per-user collection rows.
-- Users can rename or delete these without affecting other users.

BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;

CREATE OR REPLACE FUNCTION private.seed_glovebox_default_collections(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.glovebox_collections (user_id, name)
    VALUES
        (target_user_id, 'Health & vet'),
        (target_user_id, 'NLIS & compliance'),
        (target_user_id, 'Sales & receipts'),
        (target_user_id, 'Sale Reports'),
        (target_user_id, 'Leases & property'),
        (target_user_id, 'Soil & pasture'),
        (target_user_id, 'Kill sheets'),
        (target_user_id, 'Breeding records'),
        (target_user_id, 'General Reports'),
        (target_user_id, 'Processor Grids'),
        (target_user_id, 'Photos'),
        (target_user_id, 'Finance & admin'),
        (target_user_id, 'General')
    ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION private.handle_new_user_glovebox_collections()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM private.seed_glovebox_default_collections(NEW.id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_seed_glovebox_collections ON auth.users;
CREATE TRIGGER on_auth_user_created_seed_glovebox_collections
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION private.handle_new_user_glovebox_collections();

SELECT private.seed_glovebox_default_collections(id)
FROM auth.users;

COMMIT;
