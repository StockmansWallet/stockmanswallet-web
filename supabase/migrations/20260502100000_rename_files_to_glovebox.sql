-- Rename the shared document store from Brangus Files to Glovebox.
-- Glovebox is the app-wide document library used by Brangus, Ch 40,
-- Grid IQ, Reports, Yard Book, and direct uploads.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.brangus_files') IS NOT NULL
       AND to_regclass('public.glovebox_files') IS NULL THEN
        ALTER TABLE public.brangus_files RENAME TO glovebox_files;
    END IF;
END $$;

ALTER TABLE IF EXISTS public.glovebox_files ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.glovebox_files
    DROP CONSTRAINT IF EXISTS brangus_files_source_valid;
ALTER TABLE IF EXISTS public.glovebox_files
    DROP CONSTRAINT IF EXISTS glovebox_files_source_valid;

UPDATE public.glovebox_files
SET source = 'glovebox'
WHERE source = 'files';

ALTER TABLE IF EXISTS public.glovebox_files
    ADD CONSTRAINT glovebox_files_source_valid
    CHECK (source IN ('glovebox', 'chat', 'ch40', 'grid_iq', 'reports', 'yard_book'));

ALTER TABLE IF EXISTS public.glovebox_files
    ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE IF EXISTS public.glovebox_files
    DROP CONSTRAINT IF EXISTS brangus_files_category_length;
ALTER TABLE IF EXISTS public.glovebox_files
    DROP CONSTRAINT IF EXISTS glovebox_files_category_length;
ALTER TABLE IF EXISTS public.glovebox_files
    ADD CONSTRAINT glovebox_files_category_length
    CHECK (category IS NULL OR char_length(category) <= 80);

UPDATE public.glovebox_files
SET category = CASE kind
    WHEN 'vet_report' THEN 'Health & vet'
    WHEN 'nlis' THEN 'NLIS & compliance'
    WHEN 'mla_receipt' THEN 'Sales & receipts'
    WHEN 'lease' THEN 'Leases & property'
    WHEN 'soil_test' THEN 'Soil & pasture'
    WHEN 'kill_sheet' THEN 'Kill sheets'
    WHEN 'eu_cert' THEN 'NLIS & compliance'
    WHEN 'breeding' THEN 'Breeding records'
    WHEN 'other' THEN 'General'
    ELSE category
END
WHERE category IS NULL
  AND kind IS NOT NULL;

DROP TRIGGER IF EXISTS trg_brangus_files_touch_updated_at ON public.glovebox_files;
DROP TRIGGER IF EXISTS trg_glovebox_files_touch_updated_at ON public.glovebox_files;

CREATE OR REPLACE FUNCTION public.glovebox_files_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_glovebox_files_touch_updated_at
    BEFORE UPDATE ON public.glovebox_files
    FOR EACH ROW
    EXECUTE FUNCTION public.glovebox_files_touch_updated_at();

DROP FUNCTION IF EXISTS public.brangus_files_touch_updated_at();

DROP POLICY IF EXISTS users_own_files_select ON public.glovebox_files;
DROP POLICY IF EXISTS users_own_files_insert ON public.glovebox_files;
DROP POLICY IF EXISTS users_own_files_update ON public.glovebox_files;
DROP POLICY IF EXISTS users_own_files_delete ON public.glovebox_files;
DROP POLICY IF EXISTS users_own_glovebox_files_select ON public.glovebox_files;
DROP POLICY IF EXISTS users_own_glovebox_files_insert ON public.glovebox_files;
DROP POLICY IF EXISTS users_own_glovebox_files_update ON public.glovebox_files;
DROP POLICY IF EXISTS users_own_glovebox_files_delete ON public.glovebox_files;
DROP POLICY IF EXISTS ch40_shared_files_select ON public.glovebox_files;
DROP POLICY IF EXISTS ch40_shared_glovebox_files_select ON public.glovebox_files;

CREATE POLICY users_own_glovebox_files_select
    ON public.glovebox_files FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY users_own_glovebox_files_insert
    ON public.glovebox_files FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY users_own_glovebox_files_update
    ON public.glovebox_files FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY users_own_glovebox_files_delete
    ON public.glovebox_files FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY ch40_shared_glovebox_files_select
    ON public.glovebox_files FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.advisory_messages am
            JOIN public.connection_requests cr ON cr.id = am.connection_id
            WHERE cr.connection_type = 'producer_peer'
              AND cr.status = 'approved'
              AND (cr.requester_user_id = auth.uid() OR cr.target_user_id = auth.uid())
              AND am.attachment ->> 'type' = 'file'
              AND am.attachment ->> 'file_id' = glovebox_files.id::text
        )
    );

DROP INDEX IF EXISTS public.idx_brangus_files_user_id;
DROP INDEX IF EXISTS public.idx_brangus_files_user_kind;
DROP INDEX IF EXISTS public.idx_brangus_files_conversation;
DROP INDEX IF EXISTS public.idx_brangus_files_user_active;
DROP INDEX IF EXISTS public.idx_brangus_files_user_category;

CREATE INDEX IF NOT EXISTS idx_glovebox_files_user_id
    ON public.glovebox_files(user_id);
CREATE INDEX IF NOT EXISTS idx_glovebox_files_user_kind
    ON public.glovebox_files(user_id, kind);
CREATE INDEX IF NOT EXISTS idx_glovebox_files_conversation
    ON public.glovebox_files(conversation_id)
    WHERE conversation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_glovebox_files_user_active
    ON public.glovebox_files(user_id, updated_at DESC)
    WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_glovebox_files_user_category
    ON public.glovebox_files(user_id, category)
    WHERE is_deleted = FALSE;

INSERT INTO storage.buckets (id, name, public)
VALUES ('glovebox-files', 'glovebox-files', false)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = EXCLUDED.public;

UPDATE storage.objects
SET bucket_id = 'glovebox-files'
WHERE bucket_id = 'brangus-files';

DROP POLICY IF EXISTS "brangus_files_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "brangus_files_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "brangus_files_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "brangus_files_storage_delete" ON storage.objects;
DROP POLICY IF EXISTS "ch40_shared_files_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "glovebox_files_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "glovebox_files_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "glovebox_files_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "glovebox_files_storage_delete" ON storage.objects;
DROP POLICY IF EXISTS "ch40_shared_glovebox_files_storage_select" ON storage.objects;

CREATE POLICY "glovebox_files_storage_select"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'glovebox-files'
        AND starts_with(name, (auth.uid())::text || '/')
    );

CREATE POLICY "glovebox_files_storage_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'glovebox-files'
        AND starts_with(name, (auth.uid())::text || '/')
    );

CREATE POLICY "glovebox_files_storage_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'glovebox-files'
        AND starts_with(name, (auth.uid())::text || '/')
    )
    WITH CHECK (
        bucket_id = 'glovebox-files'
        AND starts_with(name, (auth.uid())::text || '/')
    );

CREATE POLICY "glovebox_files_storage_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'glovebox-files'
        AND starts_with(name, (auth.uid())::text || '/')
    );

CREATE POLICY "ch40_shared_glovebox_files_storage_select"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'glovebox-files'
        AND EXISTS (
            SELECT 1
            FROM public.glovebox_files gf
            JOIN public.advisory_messages am
              ON am.attachment ->> 'type' = 'file'
             AND am.attachment ->> 'file_id' = gf.id::text
            JOIN public.connection_requests cr ON cr.id = am.connection_id
            WHERE cr.connection_type = 'producer_peer'
              AND cr.status = 'approved'
              AND (cr.requester_user_id = auth.uid() OR cr.target_user_id = auth.uid())
              AND (
                  gf.storage_path = storage.objects.name
                  OR gf.extracted_text_path = storage.objects.name
                  OR gf.preview_image_path = storage.objects.name
              )
        )
    );

COMMIT;
