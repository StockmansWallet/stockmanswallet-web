// Helpers for restoring QuickInsight cards from their persisted form.
//
// Cards live on two different row shapes:
//
//   * brangus_messages.cards_json      - per-message column for saved chats
//   * brangus_shared_chats.cards_json  - aggregate per-share column
//
// Both store the same underlying QuickInsight shape. This module keeps the
// tolerant parsing in one place so the live chat, the saved-conversation
// review, and the shared-chat detail view all stay in lockstep.

import type { QuickInsight } from "./types";

/** Parse a single JSON value into a QuickInsight, or null if the shape is off. */
function toInsight(raw: unknown): QuickInsight | null {
  if (!raw || typeof raw !== "object") return null;
  const card = raw as Record<string, unknown>;
  if (!card.label || !card.value || !card.sentiment) return null;
  return {
    id: typeof card.id === "string" ? card.id : crypto.randomUUID(),
    label: String(card.label),
    value: String(card.value),
    subtitle: typeof card.subtitle === "string" ? card.subtitle : undefined,
    sentiment: card.sentiment as QuickInsight["sentiment"],
    // We deliberately drop `action` here. Card actions only make sense in the
    // context of the live user's portfolio (eg. "open this herd"). A recipient
    // viewing a shared chat, or a user reviewing a saved conversation, can't
    // always resolve those ids, so we render the cards as read-only.
  };
}

/**
 * Hydrate cards from a list of saved messages, aggregating any `cards_json`
 * arrays into a single flat list in message order.
 */
export function hydrateCardsFromMessages(
  messages: { cards_json?: unknown }[]
): QuickInsight[] {
  const out: QuickInsight[] = [];
  for (const m of messages) {
    if (!Array.isArray(m.cards_json)) continue;
    for (const raw of m.cards_json) {
      const insight = toInsight(raw);
      if (insight) out.push(insight);
    }
  }
  return out;
}

/**
 * Hydrate cards from a single aggregate `cards_json` value (eg. the one on a
 * shared_chat row). Returns an empty array when the input isn't a card list.
 */
export function hydrateCardsFromJson(value: unknown): QuickInsight[] {
  if (!Array.isArray(value)) return [];
  const out: QuickInsight[] = [];
  for (const raw of value) {
    const insight = toInsight(raw);
    if (insight) out.push(insight);
  }
  return out;
}
