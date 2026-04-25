-- Security audit follow-up 2026-04-24.
--
-- report_exports rows are created by the service-role API route after the PDF
-- has been uploaded to the private reports bucket. The download route then
-- reads storage_path from this row and creates a service-role signed URL.
--
-- Clients therefore must not be able to mutate storage_path, user_id,
-- report_type, or config_json after insert. The previous owner UPDATE policy
-- was too broad because it allowed any owner to change those fields on their
-- own rows.

DROP POLICY IF EXISTS "report_exports owner update" ON public.report_exports;

CREATE OR REPLACE FUNCTION public.enforce_report_exports_immutable_fields()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'report_exports.user_id is immutable';
  END IF;

  IF NEW.storage_path IS DISTINCT FROM OLD.storage_path THEN
    RAISE EXCEPTION 'report_exports.storage_path is immutable';
  END IF;

  IF NEW.report_type IS DISTINCT FROM OLD.report_type THEN
    RAISE EXCEPTION 'report_exports.report_type is immutable';
  END IF;

  IF NEW.config_json IS DISTINCT FROM OLD.config_json THEN
    RAISE EXCEPTION 'report_exports.config_json is immutable';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_report_exports_immutable_fields ON public.report_exports;
CREATE TRIGGER trg_enforce_report_exports_immutable_fields
  BEFORE UPDATE ON public.report_exports
  FOR EACH ROW EXECUTE FUNCTION public.enforce_report_exports_immutable_fields();

COMMENT ON FUNCTION public.enforce_report_exports_immutable_fields()
  IS 'Prevents report export object paths and ownership fields being changed after insert.';
