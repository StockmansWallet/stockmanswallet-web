-- Add first-class Glovebox links for Yard Book and Grid IQ.

BEGIN;

ALTER TABLE public.glovebox_files
    ALTER COLUMN source SET DEFAULT 'glovebox';

ALTER TABLE public.glovebox_files
    DROP CONSTRAINT IF EXISTS brangus_files_kind_valid;
ALTER TABLE public.glovebox_files
    DROP CONSTRAINT IF EXISTS glovebox_files_kind_valid;
ALTER TABLE public.glovebox_files
    ADD CONSTRAINT glovebox_files_kind_valid
    CHECK (
        kind IS NULL
        OR kind IN (
            'vet_report',
            'nlis',
            'mla_receipt',
            'lease',
            'soil_test',
            'kill_sheet',
            'processor_grid',
            'eu_cert',
            'breeding',
            'other'
        )
    );

ALTER TABLE public.yard_book_items
    ADD COLUMN IF NOT EXISTS attachment_file_ids UUID[] DEFAULT '{}'::uuid[];

ALTER TABLE public.yard_book_notes
    ADD COLUMN IF NOT EXISTS attachment_file_ids UUID[] DEFAULT '{}'::uuid[];

ALTER TABLE public.processor_grids
    ADD COLUMN IF NOT EXISTS glovebox_file_id UUID REFERENCES public.glovebox_files(id) ON DELETE SET NULL;

ALTER TABLE public.kill_sheet_records
    ADD COLUMN IF NOT EXISTS glovebox_file_id UUID REFERENCES public.glovebox_files(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_yard_book_items_attachment_file_ids
    ON public.yard_book_items USING GIN (attachment_file_ids);

CREATE INDEX IF NOT EXISTS idx_yard_book_notes_attachment_file_ids
    ON public.yard_book_notes USING GIN (attachment_file_ids);

CREATE INDEX IF NOT EXISTS idx_processor_grids_glovebox_file_id
    ON public.processor_grids(glovebox_file_id)
    WHERE glovebox_file_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_kill_sheet_records_glovebox_file_id
    ON public.kill_sheet_records(glovebox_file_id)
    WHERE glovebox_file_id IS NOT NULL;

COMMIT;
