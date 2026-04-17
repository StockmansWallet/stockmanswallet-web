-- Move livestock_owner from properties to herds.
-- Livestock owners often agist herds on other producers' land, so ownership is a
-- herd-level attribute, not a property-level one.
--
-- Steps:
-- 1. Add herds.livestock_owner (TEXT, nullable).
-- 2. Backfill: copy existing properties.livestock_owner onto every herd on that property.
-- 3. Drop properties.livestock_owner.

ALTER TABLE public.herds ADD COLUMN IF NOT EXISTS livestock_owner TEXT;

UPDATE public.herds h
SET livestock_owner = p.livestock_owner
FROM public.properties p
WHERE h.property_id = p.id
  AND p.livestock_owner IS NOT NULL
  AND h.livestock_owner IS NULL;

ALTER TABLE public.properties DROP COLUMN IF EXISTS livestock_owner;
