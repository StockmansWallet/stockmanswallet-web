-- Migration: Create audit_log table for tracking sensitive operations
-- Records account deletions, market data uploads, and other sensitive actions
-- Date: 2 Mar 2026

CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    action TEXT NOT NULL,
    actor_user_id UUID,
    details JSONB DEFAULT '{}',
    ip_address TEXT
);

-- RLS: Only the service role can write audit logs (Edge Functions).
-- No client-side read access - audit logs are server-only.
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- No SELECT policy = no client reads. Edge Functions use service_role which bypasses RLS.

-- Index for querying by action type and time range
CREATE INDEX idx_audit_log_action_created ON audit_log (action, created_at DESC);
CREATE INDEX idx_audit_log_user_created ON audit_log (actor_user_id, created_at DESC);
