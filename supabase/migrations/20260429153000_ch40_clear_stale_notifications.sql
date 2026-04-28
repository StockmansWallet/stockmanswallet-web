-- ============================================================================
-- ch40_clear_stale_notifications
--
-- Ch 40 badges and dashboard unread counts are backed by notifications rows.
-- A producer-peer request/message can only be displayed while its
-- connection_requests row is in the matching visible state:
--   - producer_connection_request: pending incoming request
--   - new_message: approved conversation
--
-- If a request is cancelled/denied/removed, or a conversation is disconnected,
-- stale unread rows would keep driving APNs/app badges even though the Ch 40
-- hub intentionally hides that connection. Clear those rows as the status
-- changes, and clean up existing stale unread rows once.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.clear_ch40_notifications_on_connection_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.connection_type = 'producer_peer' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status <> 'pending' THEN
      UPDATE notifications
         SET is_read = TRUE
       WHERE related_connection_id = NEW.id
         AND type = 'producer_connection_request'
         AND is_read = FALSE;
    END IF;

    IF NEW.status <> 'approved' THEN
      UPDATE notifications
         SET is_read = TRUE
       WHERE related_connection_id = NEW.id
         AND type = 'new_message'
         AND link LIKE '/dashboard/ch40%'
         AND is_read = FALSE;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clear_ch40_notifications_on_connection_status_change
  ON connection_requests;

CREATE TRIGGER clear_ch40_notifications_on_connection_status_change
  AFTER UPDATE OF status ON connection_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_ch40_notifications_on_connection_status_change();

UPDATE notifications n
   SET is_read = TRUE
  FROM connection_requests cr
 WHERE n.related_connection_id = cr.id
   AND cr.connection_type = 'producer_peer'
   AND cr.status <> 'pending'
   AND n.type = 'producer_connection_request'
   AND n.is_read = FALSE;

UPDATE notifications n
   SET is_read = TRUE
  FROM connection_requests cr
 WHERE n.related_connection_id = cr.id
   AND cr.connection_type = 'producer_peer'
   AND cr.status <> 'approved'
   AND n.type = 'new_message'
   AND n.link LIKE '/dashboard/ch40%'
   AND n.is_read = FALSE;
