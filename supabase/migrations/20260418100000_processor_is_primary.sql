-- Designate a primary processor per user. Pre-selected in the Analyse flow so
-- producers with one main processor don't have to pick it every time.

ALTER TABLE processors
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

-- At most one primary per user (partial unique index ignores soft-deleted rows).
CREATE UNIQUE INDEX IF NOT EXISTS processors_one_primary_per_user
  ON processors(user_id) WHERE is_primary = true AND is_deleted = false;
