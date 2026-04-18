-- Device tokens for APNs push notifications.
-- Each user can have multiple tokens (multiple devices).
-- Tokens are upserted on app launch, removed on sign-out.

CREATE TABLE IF NOT EXISTS device_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    apns_token  TEXT NOT NULL,
    platform    TEXT NOT NULL DEFAULT 'ios' CHECK (platform IN ('ios', 'macos')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, apns_token)
);

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Users can read/insert/update/delete only their own tokens
CREATE POLICY "device_tokens_select" ON device_tokens
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "device_tokens_insert" ON device_tokens
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "device_tokens_update" ON device_tokens
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "device_tokens_delete" ON device_tokens
    FOR DELETE USING (user_id = auth.uid());

CREATE INDEX idx_device_tokens_user ON device_tokens(user_id);
