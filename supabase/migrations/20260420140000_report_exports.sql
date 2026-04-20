-- Report exports: persistent PDF artifacts for Asset Report, Lender Report,
-- Saleyard Comparison, and Sales Summary. Supersedes the previous
-- /api/report/*/pdf streaming download flow with a storage-backed artifact
-- so that the same PDF can be reopened, shared via a token link later
-- (Producer Chat attachment, email, etc.), and consumed by iOS without
-- re-implementing PDF generation.

-- ---------------------------------------------------------------------------
-- Table: report_exports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.report_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type text NOT NULL
    CHECK (report_type IN ('asset-report', 'lender-report', 'saleyard-comparison', 'sales-summary')),
  title text NOT NULL,
  -- Input config the report was generated from (startDate, endDate,
  -- selectedPropertyIds). Useful for regeneration and for showing the user
  -- which filters were active when they saved this report.
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Path inside the `reports` storage bucket: {user_id}/{id}.pdf
  storage_path text NOT NULL,
  -- Null = private. Populated when the owner clicks "Share" (future).
  share_token text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- 90-day retention by default; cleanup cron (future) drops rows + storage
  -- objects after expiry.
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_report_exports_user
  ON public.report_exports (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_exports_share
  ON public.report_exports (share_token) WHERE share_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_report_exports_cleanup
  ON public.report_exports (expires_at) WHERE revoked_at IS NULL;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- Owner can read and update their own rows (update enables later revocation
-- flows: setting share_token back to NULL or setting revoked_at).
-- Inserts and deletes happen via service role in the API routes only.
ALTER TABLE public.report_exports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_exports owner select" ON public.report_exports;
CREATE POLICY "report_exports owner select" ON public.report_exports
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "report_exports owner update" ON public.report_exports;
CREATE POLICY "report_exports owner update" ON public.report_exports
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage: private `reports` bucket
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

-- Owner can read their own files under {user_id}/ via server-issued signed
-- URLs (reading through the anon/authenticated client; service role bypasses).
DROP POLICY IF EXISTS "reports owner read" ON storage.objects;
CREATE POLICY "reports owner read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- No INSERT/UPDATE/DELETE policies for clients - all writes flow through
-- the API route using the service role key.
