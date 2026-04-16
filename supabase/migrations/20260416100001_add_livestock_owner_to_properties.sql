-- Add Livestock Owner field to properties table
-- Optional field: name of the person or entity who owns the livestock on this property
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS livestock_owner TEXT;
