-- Add Local Government Area (LGA) field to properties table
-- Used for advisor dashboard region grouping (e.g. "Charters Towers Regional Council")
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS lga TEXT;
