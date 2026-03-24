-- User-facing "What's New" announcements per build
-- Separate from admin dev_updates (which moves to Muster)
-- Written in simple language for end users

CREATE TABLE whats_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'web')),
  date DATE NOT NULL,
  build_label TEXT,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE whats_new ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read whats_new"
  ON whats_new FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_whats_new_date
  ON whats_new (date DESC, sort_order);
