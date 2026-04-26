-- Property pin-drop location support
--
-- Adds two columns to public.properties so users can locate rural properties
-- that lack a fixed street address (e.g. "Lancewood Station via Mirambeena
-- Road"). The freight engine already operates on lat/lng only, so no engine
-- changes are required. These columns capture the human label and the source
-- of the coordinate.
--
-- access_road     - the road the property is accessed from (recommended,
--                   not required). Free text. e.g. "Mirambeena Road".
-- location_source - how the latitude/longitude was captured. Constrained to
--                   a small set of values; default 'geocoded' for backward
--                   compatibility with rows created via address autocomplete.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS access_road TEXT,
  ADD COLUMN IF NOT EXISTS location_source TEXT NOT NULL DEFAULT 'geocoded';

ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_location_source_check;

ALTER TABLE public.properties
  ADD CONSTRAINT properties_location_source_check
    CHECK (location_source IN ('geocoded', 'pin_dropped'));

COMMENT ON COLUMN public.properties.access_road IS
  'Road the property is accessed from (e.g. "Mirambeena Road"). Recommended for rural properties without a fixed street address.';
COMMENT ON COLUMN public.properties.location_source IS
  'How latitude/longitude was captured: geocoded (from address autocomplete) or pin_dropped (user placed a pin on a map).';
