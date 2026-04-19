-- ============================================================================
-- Yard Book Overdue Notifications
-- Adds the plumbing for a daily cron that inserts a yard_book_overdue
-- notification for every unfinished Yard Book item whose event_date has
-- passed, without re-notifying on items already announced.
--
--   1. overdue_notified_at column on yard_book_items tracks when we last
--      sent an overdue notification. Comparing it to event_date lets users
--      bump an item forward and get re-notified when it lapses again.
--   2. notifications.type CHECK constraint widened to include yard_book_overdue.
--   3. pg_cron job hits the check-yard-book-items edge function nightly.
-- ============================================================================

-- 1. Track when we last fired an overdue notification for each item.
ALTER TABLE yard_book_items
    ADD COLUMN IF NOT EXISTS overdue_notified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS yard_book_items_overdue_scan_idx
    ON yard_book_items (event_date)
    WHERE is_completed = false AND is_deleted = false;

-- 2. Allow yard_book_overdue on the notifications CHECK constraint. The
-- constraint is rebuilt as a superset so existing rows remain valid.
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'notifications'
          AND constraint_name = 'notifications_type_check'
    ) THEN
        ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
    END IF;
    ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
        CHECK (type IN (
            'new_connection_request', 'request_approved', 'request_denied',
            'access_expired', 'new_message', 'renewal_requested',
            'market_price_alert', 'yard_book_overdue'
        ));
END $$;

-- 3. Schedule the daily cron. Mirrors check-market-alerts-daily.
-- 20:00 UTC = 06:00 AEST / 07:00 AEDT so producers get overdue badges
-- waiting when they start the day.
SELECT cron.unschedule('check-yard-book-items-daily')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'check-yard-book-items-daily'
);

SELECT cron.schedule(
    'check-yard-book-items-daily',
    '0 20 * * *',
    $$
      SELECT net.http_post(
        url := 'https://glxnmljnuzigyqydsxhc.functions.supabase.co/check-yard-book-items',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
      ) AS request_id;
    $$
);
