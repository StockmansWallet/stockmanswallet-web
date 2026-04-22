-- ============================================================================
-- Producer Network: connections-first model
--
-- Context: The producer network is moving from "all discoverable producers
-- appear in a list" to "you must search to find producers, and only confirmed
-- connections appear in default views". This migration ensures the RLS on
-- user_profiles reflects that model:
--
--   - A user who turns off is_discoverable_to_producers should no longer
--     appear in directory search results - already handled by the query-level
--     filter in the web app.
--   - BUT an already-connected peer should still be able to read your profile
--     even if you later turn off discoverability. Otherwise connections break.
--
-- The new condition adds an EXISTS subquery: if auth.uid() has an approved
-- producer_peer connection with this profile's user_id, reading is allowed
-- regardless of the discoverability flags.
-- ============================================================================

DROP POLICY IF EXISTS "Read discoverable profiles or own" ON user_profiles;

CREATE POLICY "Read discoverable profiles or own"
  ON user_profiles FOR SELECT
  USING (
    is_discoverable = true
    OR is_listed_in_directory = true
    OR is_discoverable_to_producers = true
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1
        FROM connection_requests cr
       WHERE cr.connection_type = 'producer_peer'
         AND cr.status = 'approved'
         AND (
               (cr.requester_user_id = auth.uid() AND cr.target_user_id = user_profiles.user_id)
            OR (cr.target_user_id   = auth.uid() AND cr.requester_user_id = user_profiles.user_id)
         )
    )
  );
