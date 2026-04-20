-- ============================================================================
-- Rename farmer-centric values to producer as part of the app-wide
-- "Producer Network" terminology cleanup. Still in beta, so we flip the
-- values in place rather than keeping compatibility aliases.
--
--   1. connection_requests.connection_type: 'farmer_peer' -> 'producer_peer'
--   2. notifications: no existing rows use 'farmer_*' types (the prior
--      CHECK constraint did not allow them), but we re-state the constraint
--      so it includes the producer_* values the TypeScript code inserts.
-- ============================================================================

-- 1. Connection type data flip.
UPDATE connection_requests
   SET connection_type = 'producer_peer'
 WHERE connection_type = 'farmer_peer';

-- 2. Widen the notifications.type CHECK constraint to include the two new
--    producer notification types. Rebuilt as a superset so existing rows
--    remain valid.
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
            'market_price_alert', 'yard_book_overdue',
            'producer_connection_request', 'producer_request_approved'
        ));
END $$;
