-- Harden Glovebox policies after the app-wide rename.

BEGIN;

CREATE OR REPLACE FUNCTION public.glovebox_files_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP POLICY IF EXISTS users_own_glovebox_files_select ON public.glovebox_files;
DROP POLICY IF EXISTS users_own_glovebox_files_insert ON public.glovebox_files;
DROP POLICY IF EXISTS users_own_glovebox_files_update ON public.glovebox_files;
DROP POLICY IF EXISTS users_own_glovebox_files_delete ON public.glovebox_files;
DROP POLICY IF EXISTS ch40_shared_glovebox_files_select ON public.glovebox_files;
DROP POLICY IF EXISTS glovebox_files_select ON public.glovebox_files;

CREATE POLICY glovebox_files_select
    ON public.glovebox_files FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
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

DROP POLICY IF EXISTS "glovebox_files_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "glovebox_files_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "glovebox_files_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "glovebox_files_storage_delete" ON storage.objects;
DROP POLICY IF EXISTS "ch40_shared_glovebox_files_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "glovebox_files_storage_select_all" ON storage.objects;

CREATE POLICY "glovebox_files_storage_select_all"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'glovebox-files'
        AND (
            starts_with(name, (auth.uid())::text || '/')
            OR EXISTS (
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
        )
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

COMMIT;
