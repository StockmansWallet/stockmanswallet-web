-- Add advisory_messages to the supabase_realtime publication so that
-- postgres_changes INSERT events are emitted to subscribed clients.
-- Without this, the Ch 40 producer chat falls back to its 60s polling
-- safety net and messages don't appear live across web and iOS until
-- the next refresh.

alter publication supabase_realtime add table public.advisory_messages;
