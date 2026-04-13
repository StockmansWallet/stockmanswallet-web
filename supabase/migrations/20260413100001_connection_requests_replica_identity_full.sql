-- Set FULL replica identity on connection_requests so Supabase Realtime
-- can match filters on requester_user_id/target_user_id during UPDATE events.
-- Without this, filtered subscriptions only fire for INSERT, not UPDATE.
ALTER TABLE connection_requests REPLICA IDENTITY FULL;
