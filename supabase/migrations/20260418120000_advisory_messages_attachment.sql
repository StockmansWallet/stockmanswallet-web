-- Allow chat messages to carry a structured attachment (shared herd, shared
-- market price, etc). The attachment is a frozen snapshot taken at send time
-- so the receiver sees the data that was true when it was shared, even if
-- the source row is later edited or deleted.
--
-- Attachment schema (enforced at the app layer, not here, for flexibility):
--   { type: 'herd',  herd_id: uuid, name, species, breed, category, head_count,
--                    current_weight?, initial_weight?, estimated_value? }
--   { type: 'price', category, saleyard, price_per_kg, weight_range?, breed?,
--                    data_date }

ALTER TABLE advisory_messages
  ADD COLUMN IF NOT EXISTS attachment JSONB;

COMMENT ON COLUMN advisory_messages.attachment IS
  'Optional frozen snapshot of a shared herd or market price. Schema is app-enforced; type field discriminates.';
