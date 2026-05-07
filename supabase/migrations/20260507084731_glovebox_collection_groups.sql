-- Add stable Glovebox section groups and collection IDs.
-- The legacy glovebox_files.collection label stays as a compatibility field
-- while web and iOS move file ownership to glovebox_files.collection_id.

BEGIN;

CREATE TABLE IF NOT EXISTS public.glovebox_collection_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_system_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT glovebox_collection_groups_name_length CHECK (
        char_length(btrim(name)) BETWEEN 1 AND 80
    )
);

ALTER TABLE public.glovebox_collection_groups ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.glovebox_collection_groups TO authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS idx_glovebox_collection_groups_user_name_ci
    ON public.glovebox_collection_groups(user_id, lower(btrim(name)));

CREATE INDEX IF NOT EXISTS idx_glovebox_collection_groups_user_sort
    ON public.glovebox_collection_groups(user_id, sort_order, id);

CREATE INDEX IF NOT EXISTS idx_glovebox_collection_groups_user_updated
    ON public.glovebox_collection_groups(user_id, updated_at DESC);

DROP TRIGGER IF EXISTS trg_glovebox_collection_groups_touch_updated_at
    ON public.glovebox_collection_groups;
CREATE TRIGGER trg_glovebox_collection_groups_touch_updated_at
    BEFORE UPDATE ON public.glovebox_collection_groups
    FOR EACH ROW
    EXECUTE FUNCTION public.glovebox_files_touch_updated_at();

DROP POLICY IF EXISTS users_own_glovebox_collection_groups_select
    ON public.glovebox_collection_groups;
DROP POLICY IF EXISTS users_own_glovebox_collection_groups_insert
    ON public.glovebox_collection_groups;
DROP POLICY IF EXISTS users_own_glovebox_collection_groups_update
    ON public.glovebox_collection_groups;
DROP POLICY IF EXISTS users_own_glovebox_collection_groups_delete
    ON public.glovebox_collection_groups;

CREATE POLICY users_own_glovebox_collection_groups_select
    ON public.glovebox_collection_groups FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY users_own_glovebox_collection_groups_insert
    ON public.glovebox_collection_groups FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY users_own_glovebox_collection_groups_update
    ON public.glovebox_collection_groups FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY users_own_glovebox_collection_groups_delete
    ON public.glovebox_collection_groups FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

ALTER TABLE public.glovebox_collections
    ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.glovebox_collection_groups(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_system_default BOOLEAN NOT NULL DEFAULT FALSE;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.glovebox_collections TO authenticated;

CREATE INDEX IF NOT EXISTS idx_glovebox_collections_user_group_sort
    ON public.glovebox_collections(user_id, group_id, sort_order, name);

ALTER TABLE public.glovebox_files
    ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES public.glovebox_collections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_glovebox_files_user_collection_id
    ON public.glovebox_files(user_id, collection_id)
    WHERE is_deleted = FALSE;

CREATE OR REPLACE FUNCTION private.ensure_glovebox_default_structure(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    sales_group_id UUID;
    compliance_group_id UUID;
    livestock_group_id UUID;
    soil_group_id UUID;
    property_group_id UUID;
    finance_group_id UUID;
    general_group_id UUID;
BEGIN
    UPDATE public.glovebox_collections collection
    SET name = CASE lower(btrim(collection.name))
            WHEN 'health & vet' THEN 'Health and vet'
            WHEN 'nlis & compliance' THEN 'NLIS and compliance'
            WHEN 'soil & pasture' THEN 'Soil and pasture'
            WHEN 'leases & property' THEN 'Leases and property'
            WHEN 'finance & admin' THEN 'Finance and admin'
            WHEN 'sale reports' THEN 'Market/saleyard reports'
            WHEN 'kill sheets' THEN 'Processor kill/summary sheets'
            ELSE collection.name
        END
    WHERE collection.user_id = target_user_id
      AND lower(btrim(collection.name)) IN (
          'health & vet',
          'nlis & compliance',
          'soil & pasture',
          'leases & property',
          'finance & admin',
          'sale reports',
          'kill sheets'
      )
      AND NOT EXISTS (
          SELECT 1
          FROM public.glovebox_collections existing
          WHERE existing.user_id = collection.user_id
            AND lower(btrim(existing.name)) = CASE lower(btrim(collection.name))
                WHEN 'health & vet' THEN 'health and vet'
                WHEN 'nlis & compliance' THEN 'nlis and compliance'
                WHEN 'soil & pasture' THEN 'soil and pasture'
                WHEN 'leases & property' THEN 'leases and property'
                WHEN 'finance & admin' THEN 'finance and admin'
                WHEN 'sale reports' THEN 'market/saleyard reports'
                WHEN 'kill sheets' THEN 'processor kill/summary sheets'
                ELSE lower(btrim(collection.name))
            END
      );

    UPDATE public.glovebox_files file
    SET collection = CASE lower(btrim(file.collection))
            WHEN 'health & vet' THEN 'Health and vet'
            WHEN 'nlis & compliance' THEN 'NLIS and compliance'
            WHEN 'soil & pasture' THEN 'Soil and pasture'
            WHEN 'leases & property' THEN 'Leases and property'
            WHEN 'finance & admin' THEN 'Finance and admin'
            WHEN 'sale reports' THEN 'Market/saleyard reports'
            WHEN 'kill sheets' THEN 'Processor kill/summary sheets'
            ELSE file.collection
        END
    WHERE file.user_id = target_user_id
      AND lower(btrim(file.collection)) IN (
          'health & vet',
          'nlis & compliance',
          'soil & pasture',
          'leases & property',
          'finance & admin',
          'sale reports',
          'kill sheets'
      );

    INSERT INTO public.glovebox_collection_groups (user_id, name, sort_order, is_system_default)
    VALUES
        (target_user_id, 'Sales', 10, TRUE),
        (target_user_id, 'Compliance', 20, TRUE),
        (target_user_id, 'Livestock', 30, TRUE),
        (target_user_id, 'Soil and Pasture', 40, TRUE),
        (target_user_id, 'Lease and Property', 50, TRUE),
        (target_user_id, 'Finance and Admin', 60, TRUE),
        (target_user_id, 'General', 70, TRUE)
    ON CONFLICT DO NOTHING;

    SELECT id INTO sales_group_id
    FROM public.glovebox_collection_groups
    WHERE user_id = target_user_id AND lower(btrim(name)) = 'sales';

    SELECT id INTO compliance_group_id
    FROM public.glovebox_collection_groups
    WHERE user_id = target_user_id AND lower(btrim(name)) = 'compliance';

    SELECT id INTO livestock_group_id
    FROM public.glovebox_collection_groups
    WHERE user_id = target_user_id AND lower(btrim(name)) = 'livestock';

    SELECT id INTO soil_group_id
    FROM public.glovebox_collection_groups
    WHERE user_id = target_user_id AND lower(btrim(name)) = 'soil and pasture';

    SELECT id INTO property_group_id
    FROM public.glovebox_collection_groups
    WHERE user_id = target_user_id AND lower(btrim(name)) = 'lease and property';

    SELECT id INTO finance_group_id
    FROM public.glovebox_collection_groups
    WHERE user_id = target_user_id AND lower(btrim(name)) = 'finance and admin';

    SELECT id INTO general_group_id
    FROM public.glovebox_collection_groups
    WHERE user_id = target_user_id AND lower(btrim(name)) = 'general';

    INSERT INTO public.glovebox_collections (user_id, group_id, name, sort_order, is_system_default)
    VALUES
        (target_user_id, sales_group_id, 'Market/saleyard reports', 10, TRUE),
        (target_user_id, sales_group_id, 'Live export orders', 20, TRUE),
        (target_user_id, sales_group_id, 'Feedlot orders', 30, TRUE),
        (target_user_id, sales_group_id, 'Processor Grids', 40, TRUE),
        (target_user_id, sales_group_id, 'Processor kill/summary sheets', 50, TRUE),
        (target_user_id, compliance_group_id, 'Waybills', 10, TRUE),
        (target_user_id, compliance_group_id, 'Program certificates', 20, TRUE),
        (target_user_id, compliance_group_id, 'Transport dockets', 30, TRUE),
        (target_user_id, compliance_group_id, 'NLIS and compliance', 40, TRUE),
        (target_user_id, livestock_group_id, 'Breeding records', 10, TRUE),
        (target_user_id, livestock_group_id, 'Health and vet', 20, TRUE),
        (target_user_id, soil_group_id, 'Soil and pasture', 10, TRUE),
        (target_user_id, property_group_id, 'Leases and property', 10, TRUE),
        (target_user_id, finance_group_id, 'Finance and admin', 10, TRUE),
        (target_user_id, general_group_id, 'Photos', 10, TRUE),
        (target_user_id, general_group_id, 'General', 20, TRUE)
    ON CONFLICT DO NOTHING;

    WITH ranked AS (
        SELECT
            collection.id,
            CASE
            WHEN lower(btrim(collection.name)) IN (
                'market/saleyard reports',
                'sale reports',
                'sales & receipts',
                'sales and receipts',
                'live export orders',
                'feedlot orders',
                'processor grids',
                'processor kill/summary sheets',
                'kill sheets'
            ) THEN sales_group_id
            WHEN lower(btrim(collection.name)) IN (
                'waybills',
                'program certificates',
                'transport dockets',
                'nlis & compliance',
                'nlis and compliance'
            ) THEN compliance_group_id
            WHEN lower(btrim(collection.name)) IN (
                'breeding records',
                'health & vet',
                'health and vet'
            ) THEN livestock_group_id
            WHEN lower(btrim(collection.name)) IN ('soil & pasture', 'soil and pasture') THEN soil_group_id
            WHEN lower(btrim(collection.name)) IN (
                'leases & property',
                'leases and property',
                'lease and property'
            ) THEN property_group_id
            WHEN lower(btrim(collection.name)) IN ('finance & admin', 'finance and admin') THEN finance_group_id
            ELSE general_group_id
            END AS resolved_group_id,
            CASE
                WHEN collection.sort_order = 0 THEN
                row_number() OVER (
                    PARTITION BY collection.user_id
                    ORDER BY lower(btrim(collection.name)), collection.id
                ) * 10
                ELSE collection.sort_order
            END AS resolved_sort_order
        FROM public.glovebox_collections collection
        WHERE collection.user_id = target_user_id
          AND collection.group_id IS NULL
    )
    UPDATE public.glovebox_collections collection
    SET group_id = ranked.resolved_group_id,
        sort_order = ranked.resolved_sort_order
    FROM ranked
    WHERE collection.id = ranked.id;
END;
$$;

CREATE OR REPLACE FUNCTION private.seed_glovebox_default_collections(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM private.ensure_glovebox_default_structure(target_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION private.glovebox_collections_sync_file_labels()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.name IS DISTINCT FROM OLD.name THEN
        UPDATE public.glovebox_files
        SET collection = NEW.name
        WHERE collection_id = NEW.id
          AND user_id = NEW.user_id;
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        UPDATE public.glovebox_files
        SET collection_id = NULL,
            collection = NULL
        WHERE collection_id = OLD.id
          AND user_id = OLD.user_id;
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_glovebox_collections_sync_file_labels
    ON public.glovebox_collections;
DROP TRIGGER IF EXISTS trg_glovebox_collections_clear_file_labels
    ON public.glovebox_collections;
CREATE TRIGGER trg_glovebox_collections_sync_file_labels
    AFTER UPDATE OF name
    ON public.glovebox_collections
    FOR EACH ROW
    EXECUTE FUNCTION private.glovebox_collections_sync_file_labels();

CREATE TRIGGER trg_glovebox_collections_clear_file_labels
    BEFORE DELETE
    ON public.glovebox_collections
    FOR EACH ROW
    EXECUTE FUNCTION private.glovebox_collections_sync_file_labels();

SELECT private.ensure_glovebox_default_structure(id)
FROM auth.users;

UPDATE public.glovebox_files file
SET collection_id = collection.id,
    collection = collection.name
FROM public.glovebox_collections collection
WHERE file.collection_id IS NULL
  AND file.user_id = collection.user_id
  AND lower(btrim(file.collection)) = lower(btrim(collection.name));

DROP FUNCTION IF EXISTS public.glovebox_files_sync_collection_label();

CREATE OR REPLACE FUNCTION private.glovebox_files_sync_collection_label()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    matched_collection public.glovebox_collections%ROWTYPE;
    general_group_id UUID;
BEGIN
    IF NEW.collection_id IS NOT NULL THEN
        SELECT *
        INTO matched_collection
        FROM public.glovebox_collections
        WHERE id = NEW.collection_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Glovebox collection % does not exist', NEW.collection_id
                USING ERRCODE = 'foreign_key_violation';
        END IF;

        IF matched_collection.user_id <> NEW.user_id THEN
            RAISE EXCEPTION 'Glovebox collection owner does not match file owner'
                USING ERRCODE = 'check_violation';
        END IF;

        NEW.collection = matched_collection.name;
        RETURN NEW;
    END IF;

    IF NEW.collection IS NOT NULL AND btrim(NEW.collection) <> '' THEN
        SELECT *
        INTO matched_collection
        FROM public.glovebox_collections
        WHERE user_id = NEW.user_id
          AND lower(btrim(name)) = lower(btrim(NEW.collection))
        LIMIT 1;

        IF NOT FOUND THEN
            PERFORM private.ensure_glovebox_default_structure(NEW.user_id);

            SELECT id
            INTO general_group_id
            FROM public.glovebox_collection_groups
            WHERE user_id = NEW.user_id
              AND lower(btrim(name)) = 'general'
            LIMIT 1;

            INSERT INTO public.glovebox_collections (
                user_id,
                group_id,
                name,
                sort_order,
                is_system_default
            )
            VALUES (
                NEW.user_id,
                general_group_id,
                btrim(NEW.collection),
                COALESCE((
                    SELECT max(sort_order) + 10
                    FROM public.glovebox_collections
                    WHERE user_id = NEW.user_id
                      AND group_id IS NOT DISTINCT FROM general_group_id
                ), 10),
                FALSE
            )
            ON CONFLICT (user_id, (lower(btrim(name)))) DO UPDATE
            SET name = EXCLUDED.name
            RETURNING * INTO matched_collection;
        END IF;

        NEW.collection_id = matched_collection.id;
        NEW.collection = matched_collection.name;
        RETURN NEW;
    END IF;

    NEW.collection = NULL;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_glovebox_files_sync_collection_label ON public.glovebox_files;
CREATE TRIGGER trg_glovebox_files_sync_collection_label
    BEFORE INSERT OR UPDATE OF user_id, collection_id, collection
    ON public.glovebox_files
    FOR EACH ROW
    EXECUTE FUNCTION private.glovebox_files_sync_collection_label();

COMMIT;
