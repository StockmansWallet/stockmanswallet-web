-- Allow Ch 40 participants to open files explicitly attached to messages.
-- Ownership policies stay in place; these policies only add read access when
-- the current user is a participant in an approved producer-peer connection
-- containing a message whose attachment JSON points at the file.

CREATE POLICY ch40_shared_files_select
    ON public.brangus_files FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.advisory_messages am
            JOIN public.connection_requests cr ON cr.id = am.connection_id
            WHERE cr.connection_type = 'producer_peer'
              AND cr.status = 'approved'
              AND (cr.requester_user_id = auth.uid() OR cr.target_user_id = auth.uid())
              AND am.attachment ->> 'type' = 'file'
              AND am.attachment ->> 'file_id' = brangus_files.id::text
        )
    );

CREATE POLICY ch40_shared_files_storage_select
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'brangus-files'
        AND EXISTS (
            SELECT 1
            FROM public.brangus_files bf
            JOIN public.advisory_messages am
              ON am.attachment ->> 'type' = 'file'
             AND am.attachment ->> 'file_id' = bf.id::text
            JOIN public.connection_requests cr ON cr.id = am.connection_id
            WHERE cr.connection_type = 'producer_peer'
              AND cr.status = 'approved'
              AND (cr.requester_user_id = auth.uid() OR cr.target_user_id = auth.uid())
              AND (
                  bf.storage_path = storage.objects.name
                  OR bf.extracted_text_path = storage.objects.name
                  OR bf.preview_image_path = storage.objects.name
              )
        )
    );
