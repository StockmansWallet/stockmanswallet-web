-- Two small RLS gaps picked up in the iOS-migration tree audit follow-up:
--
-- 1. brangus_user_memories UPDATE: was missing a WITH CHECK clause, so
--    a signed-in user could UPDATE their own memory row and change
--    user_id to another user's id in the same update - transferring
--    ownership. The USING clause only gates which rows are visible for
--    update, not the values being written.
--
-- 2. storage.objects: the profile-photos bucket had INSERT and UPDATE
--    policies scoped to "avatars/<auth.uid()>" but no DELETE policy,
--    so users could never remove their own uploaded avatar.

DROP POLICY IF EXISTS "users_own_memories_update" ON brangus_user_memories;
CREATE POLICY "users_own_memories_update"
  ON brangus_user_memories FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND starts_with(name, 'avatars/' || auth.uid()::text)
  );
