-- ============================================================================
-- create_notification: switch new_message to per-message counting
-- Prior behaviour deduplicated unread new_message notifications per
-- connection, so a burst of messages from the same sender collapsed into
-- one unread row. That conflicted with the APNs push path which already
-- fires per message, and left the sidebar badge underreporting activity.
--
-- This migration drops the dedup branch so every message inserts its own
-- row. Matches iOS/macOS app-icon-badge conventions (Messages, Mail,
-- Slack) where the top-level badge is a total unread count.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id uuid,
    p_type text,
    p_title text,
    p_body text,
    p_link text,
    p_related_connection_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO notifications (user_id, type, title, body, link, related_connection_id)
    VALUES (p_user_id, p_type, p_title, p_body, p_link, p_related_connection_id);
END;
$function$;
