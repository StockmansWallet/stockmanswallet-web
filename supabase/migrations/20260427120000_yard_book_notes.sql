-- ============================================================================
-- YARD BOOK NOTES
-- ============================================================================
-- Free-form jotting table for the Yard Book ("digital pocketbook").
-- Distinct from yard_book_items (events/reminders): notes have no date, no
-- recurrence, no completion. They are short text entries that can optionally
-- be linked to a herd or property and pinned to the top of the list.
-- ============================================================================

CREATE TABLE yard_book_notes (
    id                          UUID PRIMARY KEY,
    user_id                     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Content (title may be empty, body is the main field)
    title                       TEXT NOT NULL DEFAULT '',
    body                        TEXT NOT NULL DEFAULT '',

    -- Pinned notes float to the top of the list
    is_pinned                   BOOLEAN NOT NULL DEFAULT false,

    -- Optional linking
    linked_herd_ids             UUID[],
    property_id                 UUID,

    -- Demo data flag
    is_demo_data                BOOLEAN NOT NULL DEFAULT false,

    -- Sync metadata (matches the pattern used by yard_book_items)
    is_deleted                  BOOLEAN NOT NULL DEFAULT false,
    deleted_at                  TIMESTAMPTZ,
    last_synced_at              TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE yard_book_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_yard_book_notes_select"
    ON yard_book_notes FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "users_own_yard_book_notes_insert"
    ON yard_book_notes FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_own_yard_book_notes_update"
    ON yard_book_notes FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON yard_book_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_yard_book_notes_user_id ON yard_book_notes (user_id);
CREATE INDEX idx_yard_book_notes_user_pinned_updated ON yard_book_notes (user_id, is_pinned DESC, updated_at DESC);
CREATE INDEX idx_yard_book_notes_updated_at ON yard_book_notes (user_id, updated_at);
