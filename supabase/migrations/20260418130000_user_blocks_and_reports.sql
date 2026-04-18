-- Moderation primitives for the Producer Network.
-- user_blocks: unilateral block (no notification to the blocked party).
-- user_reports: abuse report surfaced to admin for review.

-- =========================================================================
-- user_blocks
-- =========================================================================
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_blocks_no_self CHECK (blocker_user_id <> blocked_user_id),
  CONSTRAINT user_blocks_unique UNIQUE (blocker_user_id, blocked_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_user_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_user_id);

ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- Blocker can manage their own blocks. Blocked party must NOT be able to
-- read this table so they don't learn who blocked them.
DROP POLICY IF EXISTS "Users manage own blocks" ON user_blocks;
CREATE POLICY "Users manage own blocks"
  ON user_blocks FOR ALL
  TO authenticated
  USING (blocker_user_id = auth.uid())
  WITH CHECK (blocker_user_id = auth.uid());

-- =========================================================================
-- user_reports
-- =========================================================================
CREATE TABLE IF NOT EXISTS user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'abusive', 'impersonation', 'other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_reports_no_self CHECK (reporter_user_id <> reported_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON user_reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported ON user_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status)
  WHERE status = 'pending';

ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own reports" ON user_reports;
CREATE POLICY "Users read own reports"
  ON user_reports FOR SELECT
  TO authenticated
  USING (reporter_user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own reports" ON user_reports;
CREATE POLICY "Users insert own reports"
  ON user_reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_user_id = auth.uid());

-- No UPDATE / DELETE policies for non-admins: reports are immutable once
-- filed. Admin review happens via service role.
