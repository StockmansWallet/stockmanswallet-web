-- Glovebox Files
-- Document/photo storage for Glovebox.
-- One row per uploaded file, regardless of whether it was uploaded from the
-- Glovebox tool or directly attached in a chat message.
-- Glovebox stores any format - PDFs and images go to Claude natively as document
-- /image content blocks; everything else is text-extracted into extracted.txt
-- by the extract-file-text Edge Function on upload.

-- =====================================================================
-- glovebox_files: master file table
-- =====================================================================

CREATE TABLE IF NOT EXISTS glovebox_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Storage object pointers (paths inside the glovebox-files bucket)
    storage_path TEXT NOT NULL,           -- {uid}/{id}/original.{ext}
    extracted_text_path TEXT,             -- {uid}/{id}/extracted.txt or NULL
    preview_image_path TEXT,              -- {uid}/{id}/preview.jpg or NULL

    -- Original file metadata
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),

    -- User-facing metadata
    title TEXT NOT NULL,                  -- defaults to filename, editable
    kind TEXT,                            -- vet_report | nlis | mla_receipt | lease | soil_test | kill_sheet | eu_cert | breeding | other | NULL
    tags TEXT[] NOT NULL DEFAULT '{}',
    notes TEXT,

    -- Optional links to other portfolio entities
    herd_id UUID,                         -- NOT a FK because herds may live in iOS-side SwiftData only
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,

    -- Where the file was uploaded from
    source TEXT NOT NULL DEFAULT 'glovebox', -- glovebox | chat | ch40 | grid_iq | reports | yard_book
    conversation_id UUID REFERENCES brangus_conversations(id) ON DELETE SET NULL,

    -- Server-side text extraction state (populated by extract-file-text Edge Function)
    page_count INT,
    extraction_status TEXT NOT NULL DEFAULT 'pending', -- pending | complete | unsupported | failed | not_required
    extraction_error TEXT,
    extracted_at TIMESTAMPTZ,

    -- Sync + soft delete (mirrors brangus_conversations pattern)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,

    CONSTRAINT glovebox_files_kind_valid CHECK (
        kind IS NULL OR kind IN (
            'vet_report', 'nlis', 'mla_receipt', 'lease',
            'soil_test', 'kill_sheet', 'eu_cert', 'breeding', 'other'
        )
    ),
    CONSTRAINT glovebox_files_source_valid CHECK (source IN ('glovebox', 'chat', 'ch40', 'grid_iq', 'reports', 'yard_book')),
    CONSTRAINT glovebox_files_extraction_status_valid CHECK (
        extraction_status IN ('pending', 'complete', 'unsupported', 'failed', 'not_required')
    )
);

ALTER TABLE glovebox_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_glovebox_files_select
    ON glovebox_files FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY users_own_glovebox_files_insert
    ON glovebox_files FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY users_own_glovebox_files_update
    ON glovebox_files FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY users_own_glovebox_files_delete
    ON glovebox_files FOR DELETE
    USING (user_id = auth.uid());

CREATE INDEX idx_glovebox_files_user_id ON glovebox_files(user_id);
CREATE INDEX idx_glovebox_files_user_kind ON glovebox_files(user_id, kind);
CREATE INDEX idx_glovebox_files_conversation ON glovebox_files(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX idx_glovebox_files_user_active ON glovebox_files(user_id, updated_at DESC) WHERE is_deleted = FALSE;

-- =====================================================================
-- brangus_message_attachments: join table linking a message to its files
-- =====================================================================
-- A message may reference multiple files. A file may be referenced from
-- many messages over time (re-attached, looked up later, etc).

CREATE TABLE IF NOT EXISTS brangus_message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES brangus_messages(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES glovebox_files(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (message_id, file_id)
);

ALTER TABLE brangus_message_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_message_attachments_select
    ON brangus_message_attachments FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY users_own_message_attachments_insert
    ON brangus_message_attachments FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY users_own_message_attachments_delete
    ON brangus_message_attachments FOR DELETE
    USING (user_id = auth.uid());

CREATE INDEX idx_bma_message ON brangus_message_attachments(message_id);
CREATE INDEX idx_bma_file ON brangus_message_attachments(file_id);

-- =====================================================================
-- updated_at trigger for glovebox_files
-- =====================================================================

CREATE OR REPLACE FUNCTION glovebox_files_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_glovebox_files_touch_updated_at
    BEFORE UPDATE ON glovebox_files
    FOR EACH ROW
    EXECUTE FUNCTION glovebox_files_touch_updated_at();

-- =====================================================================
-- glovebox-files storage bucket + per-user RLS
-- =====================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('glovebox-files', 'glovebox-files', false)
ON CONFLICT (id) DO NOTHING;

-- Per-user folder policy: object name must begin with "{auth.uid()}/"
CREATE POLICY "glovebox_files_storage_select"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'glovebox-files'
        AND starts_with(name, (auth.uid())::text || '/')
    );

CREATE POLICY "glovebox_files_storage_insert"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'glovebox-files'
        AND starts_with(name, (auth.uid())::text || '/')
    );

CREATE POLICY "glovebox_files_storage_update"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'glovebox-files'
        AND starts_with(name, (auth.uid())::text || '/')
    );

CREATE POLICY "glovebox_files_storage_delete"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'glovebox-files'
        AND starts_with(name, (auth.uid())::text || '/')
    );
