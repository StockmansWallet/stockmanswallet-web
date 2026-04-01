-- Add per-herd lens support: nullable herd_id column on advisor_lenses.
-- Existing rows (portfolio-wide, herd_id = NULL) are preserved.
-- One lens per herd per connection, enforced by partial unique index.

ALTER TABLE advisor_lenses
  ADD COLUMN herd_id UUID REFERENCES herds(id);

-- Ensure one active lens per herd per connection
CREATE UNIQUE INDEX idx_advisor_lenses_connection_herd
  ON advisor_lenses (client_connection_id, herd_id)
  WHERE is_deleted = false AND herd_id IS NOT NULL;
