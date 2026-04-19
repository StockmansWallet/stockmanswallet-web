-- Market price alerts: users set thresholds on MLA categories or saleyards
-- and receive a notification when the latest avg price crosses the line.
-- Alerts are evaluated by the `check-market-alerts` Edge Function after each
-- MLA scrape. Re-trigger window is 7 days, enforced server-side.

CREATE TABLE IF NOT EXISTS market_price_alerts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_kind text NOT NULL CHECK (target_kind IN ('category', 'saleyard')),
    target_name text NOT NULL,
    state text,
    comparator text NOT NULL CHECK (comparator IN ('above', 'below')),
    threshold_cents integer NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    triggered_at timestamptz,
    last_observed_price_cents integer,
    note text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS market_price_alerts_user_active_idx
    ON market_price_alerts(user_id, is_active);

ALTER TABLE market_price_alerts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'market_price_alerts'
          AND policyname = 'market_price_alerts_select'
    ) THEN
        CREATE POLICY market_price_alerts_select ON market_price_alerts
            FOR SELECT USING (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'market_price_alerts'
          AND policyname = 'market_price_alerts_insert'
    ) THEN
        CREATE POLICY market_price_alerts_insert ON market_price_alerts
            FOR INSERT WITH CHECK (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'market_price_alerts'
          AND policyname = 'market_price_alerts_update'
    ) THEN
        CREATE POLICY market_price_alerts_update ON market_price_alerts
            FOR UPDATE USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'market_price_alerts'
          AND policyname = 'market_price_alerts_delete'
    ) THEN
        CREATE POLICY market_price_alerts_delete ON market_price_alerts
            FOR DELETE USING (user_id = auth.uid());
    END IF;
END $$;

DROP TRIGGER IF EXISTS set_updated_at ON market_price_alerts;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON market_price_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Allow a new notification type for this feature. The existing CHECK
-- constraint doesn't include it, so relax and replace with a superset.
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
            'market_price_alert'
        ));
END $$;
