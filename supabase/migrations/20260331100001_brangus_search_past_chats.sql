-- Brangus Search Past Chats
-- Adds full-text search capability to brangus_messages so Brangus can
-- reference past conversations naturally when users ask about prior discussions.
-- Uses Postgres tsvector with GIN index for fast search, with ILIKE fallback
-- for livestock jargon that FTS stemming may miss.

-- 1. Add generated tsvector column for full-text search
ALTER TABLE brangus_messages
    ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;

-- 2. GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_brangus_messages_search_vector
    ON brangus_messages USING GIN (search_vector);

-- 3. Composite index for user + date filtering (speeds up the RPC query)
CREATE INDEX IF NOT EXISTS idx_brangus_messages_user_created
    ON brangus_messages (user_id, created_at DESC);

-- 4. RPC function: search_past_chats
-- Called by both iOS and web via supabase.rpc("search_past_chats", ...)
-- Uses FTS first, falls back to ILIKE if no FTS results (handles exact phrases, jargon)
-- RLS enforced via auth.uid() filter
CREATE OR REPLACE FUNCTION search_past_chats(
    search_query TEXT,
    max_results INT DEFAULT 8
)
RETURNS TABLE (
    conversation_title TEXT,
    conversation_date TIMESTAMPTZ,
    message_role TEXT,
    message_content TEXT,
    message_date TIMESTAMPTZ,
    relevance REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID;
    safe_max INT;
    fts_count INT;
BEGIN
    -- Get the authenticated user
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Cap max_results between 1 and 15
    safe_max := LEAST(GREATEST(COALESCE(max_results, 8), 1), 15);

    -- Try full-text search first
    CREATE TEMP TABLE _fts_results ON COMMIT DROP AS
    SELECT
        c.title AS conversation_title,
        c.created_at AS conversation_date,
        m.role AS message_role,
        LEFT(m.content, 500) AS message_content,
        m.created_at AS message_date,
        ts_rank(m.search_vector, websearch_to_tsquery('english', search_query)) AS relevance
    FROM brangus_messages m
    JOIN brangus_conversations c ON c.id = m.conversation_id
    WHERE m.user_id = current_user_id
        AND m.role IN ('user', 'assistant')
        AND NOT COALESCE(c.is_deleted, false)
        AND m.search_vector @@ websearch_to_tsquery('english', search_query)
    ORDER BY relevance DESC, m.created_at DESC
    LIMIT safe_max;

    SELECT count(*) INTO fts_count FROM _fts_results;

    -- If FTS found results, return them
    IF fts_count > 0 THEN
        RETURN QUERY SELECT * FROM _fts_results;
        RETURN;
    END IF;

    -- Fallback: ILIKE for exact phrases and livestock jargon FTS may miss
    RETURN QUERY
    SELECT
        c.title AS conversation_title,
        c.created_at AS conversation_date,
        m.role AS message_role,
        LEFT(m.content, 500) AS message_content,
        m.created_at AS message_date,
        0.5::REAL AS relevance
    FROM brangus_messages m
    JOIN brangus_conversations c ON c.id = m.conversation_id
    WHERE m.user_id = current_user_id
        AND m.role IN ('user', 'assistant')
        AND NOT COALESCE(c.is_deleted, false)
        AND m.content ILIKE '%' || search_query || '%'
    ORDER BY m.created_at DESC
    LIMIT safe_max;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION search_past_chats(TEXT, INT) TO authenticated;
