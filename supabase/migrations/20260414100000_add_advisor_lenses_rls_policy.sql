-- Add missing RLS policy for advisor_lenses table
-- Advisors can manage lenses on connections they are part of

CREATE POLICY "Advisors manage own lenses"
  ON advisor_lenses FOR ALL
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
