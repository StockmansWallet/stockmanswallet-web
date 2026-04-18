-- Brangus User Memories
-- Stores personal facts Brangus learns about users across conversations
-- e.g. family details, property quirks, preferences, significant events
-- Injected into system prompt at session start for personalised conversation

CREATE TABLE IF NOT EXISTS brangus_user_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fact TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT valid_category CHECK (category IN ('personal', 'property', 'livestock', 'preference', 'history', 'general'))
);

-- RLS: users can only access their own memories
ALTER TABLE brangus_user_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_memories_select
    ON brangus_user_memories FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY users_own_memories_insert
    ON brangus_user_memories FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY users_own_memories_update
    ON brangus_user_memories FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY users_own_memories_delete
    ON brangus_user_memories FOR DELETE
    USING (user_id = auth.uid());

-- Index for fast lookup by user
CREATE INDEX idx_brangus_user_memories_user_id ON brangus_user_memories(user_id);

-- Cap at 50 memories per user via a trigger
CREATE OR REPLACE FUNCTION enforce_memory_limit()
RETURNS TRIGGER AS $$
BEGIN
    -- If user already has 50 memories, delete the oldest one
    IF (SELECT count(*) FROM brangus_user_memories WHERE user_id = NEW.user_id) >= 50 THEN
        DELETE FROM brangus_user_memories
        WHERE id = (
            SELECT id FROM brangus_user_memories
            WHERE user_id = NEW.user_id
            ORDER BY created_at ASC
            LIMIT 1
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_enforce_memory_limit
    BEFORE INSERT ON brangus_user_memories
    FOR EACH ROW
    EXECUTE FUNCTION enforce_memory_limit();
