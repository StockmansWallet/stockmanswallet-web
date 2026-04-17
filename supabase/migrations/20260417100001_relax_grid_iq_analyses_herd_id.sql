-- Pre-sale and post-sale Grid IQ analyses span multiple herds via consignments,
-- so herd_id must be nullable. The row is still anchored to either a single herd
-- or a consignment.

ALTER TABLE grid_iq_analyses ALTER COLUMN herd_id DROP NOT NULL;

ALTER TABLE grid_iq_analyses
  ADD CONSTRAINT grid_iq_analyses_herd_or_consignment_required
  CHECK (herd_id IS NOT NULL OR consignment_id IS NOT NULL);
