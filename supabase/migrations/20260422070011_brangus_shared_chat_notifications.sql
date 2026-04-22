-- ============================================================================
-- brangus_shared_chat_notifications
--
-- Wires the brangus_shared_chats table into the existing notifications system
-- so a sidebar badge appears on the Brangus nav item when another producer
-- shares a chat. Two triggers handle the full lifecycle:
--
--   1. INSERT on brangus_shared_chats  -> insert a notification for the recipient
--   2. UPDATE is_read on brangus_shared_chats -> mark that notification read
--
-- The SidebarNotificationsProvider already watches the notifications table via
-- Realtime, so no client-side changes are needed beyond adding
-- notificationTypes: ["brangus_shared_chat"] to the Brangus nav item.
-- ============================================================================

-- 1. Extend the type CHECK to accept the new brangus_shared_chat type.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'new_connection_request', 'request_approved', 'request_denied',
    'access_expired', 'new_message', 'renewal_requested',
    'market_price_alert', 'yard_book_overdue',
    'producer_connection_request', 'producer_request_approved',
    'brangus_shared_chat'
  ));

-- 2. Foreign-key column so we can find the notification when clearing it.
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS related_shared_chat_id UUID
    REFERENCES brangus_shared_chats(id) ON DELETE CASCADE;

-- 3. Trigger function: insert a notification when a shared chat is received.
CREATE OR REPLACE FUNCTION notify_on_brangus_shared_chat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    body,
    link,
    related_shared_chat_id
  )
  VALUES (
    NEW.recipient_user_id,
    'brangus_shared_chat',
    COALESCE(NULLIF(TRIM(NEW.sender_display_name), ''), 'A fellow producer')
      || ' shared a Brangus chat with you',
    COALESCE(
      NULLIF(TRIM(NEW.note), ''),
      NULLIF(TRIM(NEW.title), ''),
      'Tap to view the shared chat'
    ),
    '/dashboard/brangus',
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER brangus_shared_chat_notify
  AFTER INSERT ON brangus_shared_chats
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_brangus_shared_chat();

-- 4. Trigger function: clear the notification when the recipient reads the chat.
CREATE OR REPLACE FUNCTION clear_brangus_shared_chat_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_read = TRUE AND OLD.is_read = FALSE THEN
    UPDATE notifications
    SET is_read = TRUE
    WHERE related_shared_chat_id = NEW.id
      AND is_read = FALSE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER brangus_shared_chat_mark_notification_read
  AFTER UPDATE OF is_read ON brangus_shared_chats
  FOR EACH ROW
  EXECUTE FUNCTION clear_brangus_shared_chat_notification();
