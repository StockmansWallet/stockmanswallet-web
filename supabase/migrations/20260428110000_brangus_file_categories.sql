-- Glovebox Files: flexible user-facing organisation.
-- Keeps the legacy fixed kind column for Glovebox/tool compatibility, while
-- adding an editable category users can shape into their own folder list.

ALTER TABLE glovebox_files
ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE glovebox_files
ADD CONSTRAINT glovebox_files_category_length
CHECK (category IS NULL OR char_length(category) <= 80)
NOT VALID;

UPDATE glovebox_files
SET category = CASE kind
    WHEN 'vet_report' THEN 'Health & vet'
    WHEN 'nlis' THEN 'NLIS & compliance'
    WHEN 'mla_receipt' THEN 'Sales & receipts'
    WHEN 'lease' THEN 'Leases & property'
    WHEN 'soil_test' THEN 'Soil & pasture'
    WHEN 'kill_sheet' THEN 'Kill sheets'
    WHEN 'eu_cert' THEN 'NLIS & compliance'
    WHEN 'breeding' THEN 'Breeding records'
    WHEN 'other' THEN 'General'
    ELSE category
END
WHERE category IS NULL
  AND kind IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_glovebox_files_user_category
ON glovebox_files(user_id, category)
WHERE is_deleted = FALSE;
