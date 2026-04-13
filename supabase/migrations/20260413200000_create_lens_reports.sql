-- Lens Reports: parent grouping for multi-herd advisor lens assessments
-- Each lens report groups multiple advisor_lenses rows into a single saved entity
-- that can generate a bank-submission-style valuation report.

CREATE TABLE lens_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_connection_id UUID NOT NULL REFERENCES connection_requests(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'saved', 'report_generated')),
  total_baseline_value DOUBLE PRECISION,
  total_adjusted_value DOUBLE PRECISION,
  total_shaded_value DOUBLE PRECISION,
  advisor_narrative TEXT,
  report_data JSONB,
  report_generated_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lens_reports_connection
  ON lens_reports(client_connection_id)
  WHERE is_deleted = FALSE;

-- Link existing advisor_lenses rows to a parent lens report
ALTER TABLE advisor_lenses
  ADD COLUMN lens_report_id UUID REFERENCES lens_reports(id) ON DELETE SET NULL;

CREATE INDEX idx_advisor_lenses_report
  ON advisor_lenses(lens_report_id)
  WHERE lens_report_id IS NOT NULL;

-- RLS: advisors can only manage lens reports on connections they own
ALTER TABLE lens_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors manage own lens reports"
  ON lens_reports FOR ALL
  USING (
    client_connection_id IN (
      SELECT id FROM connection_requests
      WHERE requester_user_id = auth.uid()
         OR target_user_id = auth.uid()
    )
  )
  WITH CHECK (
    client_connection_id IN (
      SELECT id FROM connection_requests
      WHERE requester_user_id = auth.uid()
         OR target_user_id = auth.uid()
    )
  );
