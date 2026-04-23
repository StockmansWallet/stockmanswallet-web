-- Brangus Shared Chats: persist summary cards alongside the frozen message snapshot
--
-- A shared chat snapshot captures the conversation at send time. Before this
-- migration only the text bubbles were carried across, but the live chat also
-- surfaces a strip of QuickInsight summary cards (freight totals, portfolio
-- values, etc). Without the cards the recipient loses the headline figures the
-- sender was reacting to. We store them as a single aggregate JSONB array on
-- the shared row, mirroring the per-message brangus_messages.cards_json
-- column's shape so the same parser handles both.

ALTER TABLE brangus_shared_chats
    ADD COLUMN IF NOT EXISTS cards_json JSONB;

-- When present the column must be an array of card objects. NULL is allowed
-- because older rows created before this migration don't carry cards.
ALTER TABLE brangus_shared_chats
    ADD CONSTRAINT shared_chats_cards_is_array
    CHECK (cards_json IS NULL OR jsonb_typeof(cards_json) = 'array');
