-- ============================================================================
-- 006: Fix category_id backfill
-- The category_prices table stores MLA category names (e.g. "Breeding Cow",
-- "Heifer") while ref_categories.name stores app names (e.g. "Breeder Cow",
-- "Weaner Heifer"). Match via ref_categories.mla_category instead.
-- When multiple app categories share the same MLA name, pick the lowest ID.
-- ============================================================================

UPDATE category_prices cp
SET category_id = sub.cat_id
FROM (
    SELECT DISTINCT ON (rc.mla_category, rs.name)
        rc.mla_category,
        rs.name AS species_name,
        rc.id AS cat_id
    FROM ref_categories rc
    JOIN ref_species rs ON rc.species_id = rs.id
    ORDER BY rc.mla_category, rs.name, rc.id
) sub
WHERE cp.category = sub.mla_category
  AND cp.species = sub.species_name
  AND cp.category_id IS NULL;
