-- Subscription infrastructure tables
-- RevenueCat webhook writes to user_subscriptions via service_role
-- usage_tracking tracks monthly feature usage per user

-- =============================================================================
-- 1. user_subscriptions - server-side source of truth for subscription state
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    revenuecat_app_user_id text,
    tier text NOT NULL DEFAULT 'stockman'
        CHECK (tier IN ('stockman', 'head_stockman', 'advisor', 'head_advisor')),
    is_active boolean NOT NULL DEFAULT true,
    platform text CHECK (platform IN ('ios', 'web', 'stripe', NULL)),
    product_id text,
    expires_at timestamptz,
    original_purchase_at timestamptz,
    last_verified_at timestamptz DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for webhook lookups by RevenueCat customer ID
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_revenuecat_id
    ON user_subscriptions(revenuecat_app_user_id);

-- Index for tier-based queries
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tier
    ON user_subscriptions(tier);

-- Auto-update updated_at trigger
CREATE TRIGGER set_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS: users can read their own subscription, no client writes
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_subscription"
    ON user_subscriptions FOR SELECT
    USING (user_id = auth.uid());

-- =============================================================================
-- 2. usage_tracking - monthly feature usage counters
-- =============================================================================
CREATE TABLE IF NOT EXISTS usage_tracking (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    period_start date NOT NULL,
    brangus_queries int NOT NULL DEFAULT 0,
    freight_calculations int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, period_start)
);

-- Index for lookups by user + period
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_period
    ON usage_tracking(user_id, period_start);

-- Auto-update updated_at trigger
CREATE TRIGGER set_usage_tracking_updated_at
    BEFORE UPDATE ON usage_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS: users can read their own usage, no client writes
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_usage"
    ON usage_tracking FOR SELECT
    USING (user_id = auth.uid());

-- =============================================================================
-- 3. Denormalized subscription_tier on user_profiles for fast reads
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles' AND column_name = 'subscription_tier'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN subscription_tier text DEFAULT 'stockman';
    END IF;
END $$;
