-- Promote Glovebox organisation from legacy category/tag metadata to
-- first-class user-managed collections.

BEGIN;

ALTER TABLE public.glovebox_files
    ADD COLUMN IF NOT EXISTS collection TEXT;

UPDATE public.glovebox_files gf
SET collection = COALESCE(
    NULLIF(btrim(gf.collection), ''),
    NULLIF(btrim(gf.category), ''),
    NULLIF(btrim((
        SELECT substring(tag FROM length('collection:') + 1)
        FROM unnest(gf.tags) AS tag
        WHERE tag LIKE 'collection:%'
        LIMIT 1
    )), ''),
    CASE gf.kind
        WHEN 'vet_report' THEN 'Health & vet'
        WHEN 'nlis' THEN 'NLIS & compliance'
        WHEN 'mla_receipt' THEN 'Sales & receipts'
        WHEN 'lease' THEN 'Leases & property'
        WHEN 'soil_test' THEN 'Soil & pasture'
        WHEN 'kill_sheet' THEN 'Kill sheets'
        WHEN 'processor_grid' THEN 'Processor Grids'
        WHEN 'eu_cert' THEN 'NLIS & compliance'
        WHEN 'breeding' THEN 'Breeding records'
        WHEN 'other' THEN 'General'
        ELSE NULL
    END
);

UPDATE public.glovebox_files
SET tags = COALESCE(
    (
        SELECT array_agg(tag ORDER BY ord)
        FROM unnest(tags) WITH ORDINALITY AS t(tag, ord)
        WHERE tag NOT LIKE 'collection:%'
    ),
    '{}'::text[]
)
WHERE EXISTS (
    SELECT 1
    FROM unnest(tags) AS tag
    WHERE tag LIKE 'collection:%'
);

ALTER TABLE public.glovebox_files
    DROP CONSTRAINT IF EXISTS brangus_files_category_length;
ALTER TABLE public.glovebox_files
    DROP CONSTRAINT IF EXISTS glovebox_files_category_length;
ALTER TABLE public.glovebox_files
    DROP CONSTRAINT IF EXISTS glovebox_files_collection_length;
ALTER TABLE public.glovebox_files
    ADD CONSTRAINT glovebox_files_collection_length
    CHECK (collection IS NULL OR char_length(collection) <= 80);

DROP INDEX IF EXISTS public.idx_glovebox_files_user_category;
CREATE INDEX IF NOT EXISTS idx_glovebox_files_user_collection
    ON public.glovebox_files(user_id, collection)
    WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS public.glovebox_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT glovebox_collections_name_length CHECK (
        char_length(btrim(name)) BETWEEN 1 AND 80
    )
);

ALTER TABLE public.glovebox_collections ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_glovebox_collections_user_name_ci
    ON public.glovebox_collections(user_id, lower(btrim(name)));

CREATE INDEX IF NOT EXISTS idx_glovebox_collections_user_updated
    ON public.glovebox_collections(user_id, updated_at DESC);

DROP TRIGGER IF EXISTS trg_glovebox_collections_touch_updated_at ON public.glovebox_collections;
CREATE TRIGGER trg_glovebox_collections_touch_updated_at
    BEFORE UPDATE ON public.glovebox_collections
    FOR EACH ROW
    EXECUTE FUNCTION public.glovebox_files_touch_updated_at();

DROP POLICY IF EXISTS users_own_glovebox_collections_select ON public.glovebox_collections;
DROP POLICY IF EXISTS users_own_glovebox_collections_insert ON public.glovebox_collections;
DROP POLICY IF EXISTS users_own_glovebox_collections_update ON public.glovebox_collections;
DROP POLICY IF EXISTS users_own_glovebox_collections_delete ON public.glovebox_collections;

CREATE POLICY users_own_glovebox_collections_select
    ON public.glovebox_collections FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY users_own_glovebox_collections_insert
    ON public.glovebox_collections FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY users_own_glovebox_collections_update
    ON public.glovebox_collections FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY users_own_glovebox_collections_delete
    ON public.glovebox_collections FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

INSERT INTO public.glovebox_collections (user_id, name)
SELECT DISTINCT user_id, btrim(collection)
FROM public.glovebox_files
WHERE collection IS NOT NULL
  AND btrim(collection) <> ''
ON CONFLICT DO NOTHING;

ALTER TABLE public.glovebox_files
    DROP COLUMN IF EXISTS category;

COMMIT;
