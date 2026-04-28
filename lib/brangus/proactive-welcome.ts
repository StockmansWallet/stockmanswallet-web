// Generates a relevance-aware welcome message via Haiku at session start.
// Mirrors the iOS BrangusChatService+ProactiveWelcome implementation.
//
// Replaces the static template greeting when there's a hook from the most recent
// chat (planned action, pending decision, mentioned injury, follow-up Brangus said
// he'd check in on). Without a hook, returns null and the static welcome stays.
//
// Single-shot Haiku call (~200 tokens, <1s). Fails closed - on error, missing
// recent_chats, or empty response, the caller keeps the static welcome.

import { createClient } from "../supabase/client";
import { sanitiseResponse } from "./chat-service";

type TimeOfDay = "morning" | "afternoon" | "evening";

export function timeOfDayForNow(): TimeOfDay {
  const hour = new Date().toLocaleString("en-AU", {
    hour: "numeric",
    hour12: false,
    timeZone: "Australia/Brisbane",
  });
  const h = Number.parseInt(hour, 10);
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  return "evening";
}

interface ProactiveWelcomeArgs {
  userName?: string | null;
  timeOfDay: TimeOfDay;
  recentChats: string | null;
}

export async function generateProactiveWelcome({
  userName,
  timeOfDay,
  recentChats,
}: ProactiveWelcomeArgs): Promise<string | null> {
  if (!recentChats || !recentChats.trim()) {
    return null;
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const nameLine = userName?.trim()
    ? `Their first name is ${userName.trim()}.`
    : "You don't know their first name; address them as mate.";
  const todLine = ({
    morning: "It's morning.",
    afternoon: "It's afternoon.",
    evening: "It's evening.",
  } as const)[timeOfDay];

  const systemPrompt = `You are Brangus, a 30-year stock agent with a larrikin streak. You work inside the Stockman's Wallet app helping Australian farmers and graziers with their livestock.

The user just opened a brand new chat with you. Write the FIRST message of that chat: a short greeting (1-2 sentences max, ideally one).

${nameLine}
${todLine}

Below is a record of your most recent prior conversation(s) with this user. Read it carefully:

${recentChats}

Decision rules:
1. If there's a clear hook from the most recent chat - a planned action they were about to do, a decision they were sleeping on, an injury or incident they mentioned, a follow-up you said you'd check in on, a market move that affects something they own - pick up the thread naturally like a mate would. Examples (use the actual first name from above where the example uses 'Luke'):
   - "Morning Luke, did the trucks roll alright with those 6 decks?"
   - "Arvo, how's the leg holding up after that weaner kick on the ramp?"
   - "Evening Luke, you make a call on those steers in the end?"
   - "G'day mate, get that drench through the heifers in the end?"
2. If there is NO clear hook (e.g. last chat was generic, or about market data with no follow-up), just give a plain time-of-day greeting and offer to help. No forced callback. Examples (again, swap in their actual first name): "Morning Luke. What's on?" or "Arvo, mate. What can I help with?"
3. NEVER invent a hook that isn't in the prior chat. If the prior chat was about EYCI prices, don't ask "how'd that go" - there's nothing to follow up on.

Voice rules:
- Australian English. No em-dashes (use commas, full stops, or rewrite).
- Always say "herd" or "herds", never "mob" or "mobs".
- Stay in character: relaxed, direct, like leaning on the rail at the yards.
- Vary how you address them across openers. Their first name (from above), 'mate', or no direct address are all fine. Lean toward using their actual first name when you have it - it feels personal and warm, like a real stock agent who knows them. Don't always default to 'mate'. One direct address per opener is plenty; don't stack the name AND 'mate' in the same line.
- Don't list memories. Don't say "I remember you told me...".
- Don't recap. One natural opener, that's it.

Respond with ONLY the greeting text. No quotes, no explanation, no JSON.`;

  const body = {
    model: "claude-haiku-4-5-20251001",
    max_tokens: 120,
    system: systemPrompt,
    messages: [
      { role: "user", content: "Write the opening greeting now." },
    ],
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${supabaseUrl}/functions/v1/brangus-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const json = await res.json();
    const text = json?.content?.[0]?.text;
    if (!text) return null;

    const cleaned = sanitiseResponse(String(text).trim());
    return cleaned.length > 0 ? cleaned : null;
  } catch (err) {
    console.warn("Proactive welcome generation failed:", err);
    return null;
  }
}
