-- Brangus Files
-- Document/photo upload feature for Brangus AI chat.
-- One row per uploaded file, regardless of whether it was uploaded from the
-- Files tool page or directly attached in a chat message.
-- Files store any format - PDFs and images go to Claude natively as document
-- /image content blocks; everything else is text-extracted into extracted.txt
-- by the extract-file-text Edge Function on upload.

-- =====================================================================
-- brangus_files: master file table
-- =====================================================================

CREATE TABLE IF NOT EXISTS brangus_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Storage object pointers (paths inside the brangus-files bucket)
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
    source TEXT NOT NULL DEFAULT 'files', -- 'files' | 'chat'
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

    CONSTRAINT brangus_files_kind_valid CHECK (
        kind IS NULL OR kind IN (
            'vet_report', 'nlis', 'mla_receipt', 'lease',
            'soil_test', 'kill_sheet', 'eu_cert', 'breeding', 'other'
        )
    ),
    CONSTRAINT brangus_files_source_valid CHECK (source IN ('files', 'chat')),
    CONSTRAINT brangus_files_extraction_status_valid CHECK (
        extraction_status IN ('pending', 'complete', 'unsupported', 'failed', 'not_required')
    )
);

ALTER TABLE brangus_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_files_select
    ON brangus_files FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY users_own_files_insert
    ON brangus_files FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY users_own_files_update
    ON brangus_files FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY users_own_files_delete
    ON brangus_files FOR DELETE
    USING (user_id = auth.uid());

CREATE INDEX idx_brangus_files_user_id ON brangus_files(user_id);
CREATE INDEX idx_brangus_files_user_kind ON brangus_files(user_id, kind);
CREATE INDEX idx_brangus_files_conversation ON brangus_files(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX idx_brangus_files_user_active ON brangus_files(user_id, updated_at DESC) WHERE is_deleted = FALSE;

-- =====================================================================
-- brangus_message_attachments: join table linking a message to its files
-- =====================================================================
-- A message may reference multiple files. A file may be referenced from
-- many messages over time (re-attached, looked up later, etc).

CREATE TABLE IF NOT EXISTS brangus_message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES brangus_messages(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES brangus_files(id) ON DELETE CASCADE,
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
-- updated_at trigger for brangus_files
-- =====================================================================

CREATE OR REPLACE FUNCTION brangus_files_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_brangus_files_touch_updated_at
    BEFORE UPDATE ON brangus_files
    FOR EACH ROW
    EXECUTE FUNCTION brangus_files_touch_updated_at();

-- =====================================================================
-- brangus-files storage bucket + per-user RLS
-- =====================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('brangus-files', 'brangus-files', false)
ON CONFLICT (id) DO NOTHING;

-- Per-user folder policy: object name must begin with "{auth.uid()}/"
CREATE POLICY "brangus_files_storage_select"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'brangus-files'
        AND starts_with(name, (auth.uid())::text || '/')
    );

CREATE POLICY "brangus_files_storage_insert"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'brangus-files'
        AND starts_with(name, (auth.uid())::text || '/')
    );

CREATE POLICY "brangus_files_storage_update"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'brangus-files'
        AND starts_with(name, (auth.uid())::text || '/')
    );

CREATE POLICY "brangus_files_storage_delete"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'brangus-files'
        AND starts_with(name, (auth.uid())::text || '/')
    );
