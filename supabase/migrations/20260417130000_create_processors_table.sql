-- Processors directory: canonical processor records owned per user.
-- Grids, kill sheets, and consignments reference a processor so the user
-- enters address and contact details once and reuses them everywhere.

CREATE TABLE IF NOT EXISTS processors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  location_latitude double precision,
  location_longitude double precision,
  contact_name text,
  contact_phone text,
  contact_email text,
  notes text,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS processors_user_id_idx ON processors(user_id) WHERE is_deleted = false;
CREATE UNIQUE INDEX IF NOT EXISTS processors_user_name_unique_idx
  ON processors(user_id, lower(name)) WHERE is_deleted = false;

ALTER TABLE processors ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_processors_select ON processors
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY users_own_processors_insert ON processors
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY users_own_processors_update ON processors
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY users_own_processors_delete ON processors
  FOR DELETE USING (user_id = auth.uid());

-- FK columns: nullable now; Phase 2 wires them from the UI.
ALTER TABLE processor_grids
  ADD COLUMN IF NOT EXISTS processor_id uuid REFERENCES processors(id) ON DELETE SET NULL;
ALTER TABLE kill_sheet_records
  ADD COLUMN IF NOT EXISTS processor_id uuid REFERENCES processors(id) ON DELETE SET NULL;
ALTER TABLE consignments
  ADD COLUMN IF NOT EXISTS processor_id uuid REFERENCES processors(id) ON DELETE SET NULL;
ALTER TABLE grid_iq_analyses
  ADD COLUMN IF NOT EXISTS processor_id uuid REFERENCES processors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS processor_grids_processor_id_idx ON processor_grids(processor_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS kill_sheet_records_processor_id_idx ON kill_sheet_records(processor_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS consignments_processor_id_idx ON consignments(processor_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS grid_iq_analyses_processor_id_idx ON grid_iq_analyses(processor_id) WHERE is_deleted = false;
