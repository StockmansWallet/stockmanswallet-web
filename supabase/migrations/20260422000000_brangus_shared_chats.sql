-- Brangus Shared Chats
-- Allows a user to share a snapshot of a Brangus conversation with another producer
-- on Stockman's Wallet. The recipient sees the chat in a "Shared" tab in their own
-- Brangus hub, rendered in chat-bubble format rather than as plain text.
--
-- Sender writes a row (messages is a jsonb snapshot taken at send time). Recipient reads
-- it. Either side can mark the row deleted on their side without affecting the other.

CREATE TABLE IF NOT EXISTS brangus_shared_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    original_conversation_id UUID, -- nullable: recipients should still see the chat if the sender later deletes the original
    title TEXT,
    sender_display_name TEXT,
    messages JSONB NOT NULL, -- array of { role: "user" | "assistant", content: string, timestamp: iso8601 }
    note TEXT,               -- optional sender note ("you might find this useful")
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted_by_sender BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted_by_recipient BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT sender_recipient_different CHECK (sender_user_id <> recipient_user_id),
    CONSTRAINT messages_is_array CHECK (jsonb_typeof(messages) = 'array')
);

-- Indexes for inbox/outbox listing
CREATE INDEX IF NOT EXISTS idx_brangus_shared_chats_recipient ON brangus_shared_chats(recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brangus_shared_chats_sender    ON brangus_shared_chats(sender_user_id, created_at DESC);

-- RLS
ALTER TABLE brangus_shared_chats ENABLE ROW LEVEL SECURITY;

-- Sender can insert rows addressed to another producer
CREATE POLICY shared_chats_insert
    ON brangus_shared_chats FOR INSERT
    WITH CHECK (sender_user_id = auth.uid());

-- Either party can read a row while they haven't soft-deleted their side
CREATE POLICY shared_chats_select
    ON brangus_shared_chats FOR SELECT
    USING (
        (sender_user_id = auth.uid() AND is_deleted_by_sender = FALSE)
        OR
        (recipient_user_id = auth.uid() AND is_deleted_by_recipient = FALSE)
    );

-- Either party can update ONLY their own flags on the row
CREATE POLICY shared_chats_update
    ON brangus_shared_chats FOR UPDATE
    USING (sender_user_id = auth.uid() OR recipient_user_id = auth.uid())
    WITH CHECK (sender_user_id = auth.uid() OR recipient_user_id = auth.uid());

-- Deletion handled via soft flags above; no FOR DELETE policy so hard deletes fail closed.
