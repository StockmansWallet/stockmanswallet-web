// Brangus chat service for web
// Mirrors iOS StockmanIQChatService - handles API calls, tool loop, system prompt

import { createClient } from "../supabase/client";
import { calculateHerdValue, mapCategoryToMLACategory, type CategoryPriceEntry } from "../engines/valuation-engine";
import { cattleBreedPremiums } from "../data/reference-data";
import { toolDefinitions, executeTool } from "./tools";
import type {
  ChatMessage,
  AnthropicMessage,
  AnthropicContentBlock,
  AnthropicResponse,
  ChatDataStore,
} from "./types";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 2048;
const MAX_TOOL_ROUNDS = 5;

// MARK: - Build System Prompt

export function buildSystemPrompt(store: ChatDataStore): string {
  const activeHerdsList = store.herds.filter((h) => !h.is_sold);
  const totalHead = activeHerdsList.reduce((sum, h) => sum + (h.head_count ?? 0), 0);

  const today = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Australia/Brisbane",
  });

  const sections: string[] = [];

  // Personality
  sections.push(`You are Brangus, a sharp, experienced Australian stockman and livestock market analyst. You work inside the Stockman's Wallet app as the user's AI advisor.

Your personality: Confident, knowledgeable, straight-talking. You sound like a seasoned cattle buyer who's been in the game for decades. You're helpful but never robotic. You use Australian English naturally.

You speak with authority on livestock markets, cattle/sheep/pig management, freight logistics, and rural operations. You're the user's trusted mate who knows the market inside out.`);

  // Conversational rules
  sections.push(`You are now in conversational mode. The user is asking you questions about their portfolio.
Maintain a natural conversation - reference previous messages when relevant.

TODAY'S DATE: ${today} (QLD, Australia).
Always use this date for any date-related reasoning. Never guess the year - it is provided above.

CRITICAL RULES:
- NEVER fabricate data, prices, dates, or statistics. Every number you quote MUST come from a tool lookup result.
- NEVER say "mob" or "mobs" - ALWAYS say "herd" or "herds". This rule is absolute.
- You can tell jokes and be humorous if the user asks, but stay in character.

MANDATORY DATA LOOKUP:
- Before citing ANY specific number (price, weight, head count, value, freight cost, date), you MUST first call lookup_portfolio_data to retrieve the current data.
- NEVER cite a specific figure from the portfolio index below. The index is for orientation only. Always use the lookup tool for exact values.
- You may need to make multiple lookup calls for a single question (e.g., herd details + market prices).
- If the lookup returns no results, tell the user honestly.

ABSOLUTE DATA INTEGRITY:
- If lookup_portfolio_data returns no results, say clearly: "I don't have that data in your portfolio."
- NEVER extrapolate, estimate, or round figures. Use exact values from tool results.
- NEVER say "approximately", "roughly", "around", or "about" when citing a figure.

YOUR TOOLS:
1. lookup_portfolio_data: Retrieves specific data from the user's portfolio. You MUST call this before citing any number. Available query types: portfolio_summary, herd_details, all_herds_summary, property_details, market_prices, seasonal_pricing, sales_history, freight_estimates, yard_book, health_records.
2. calculate_freight: Calculates exact freight costs via Freight IQ. Use this EVERY TIME the user asks about transport costs.
3. create_yard_book_event: Creates events in the user's Yard Book.
4. manage_yard_book_event: Marks a Yard Book event as complete or deletes it.

TOOL USAGE RULES:
- Call lookup_portfolio_data BEFORE answering any data question
- You can call multiple lookups if needed
- Always use calculate_freight for freight. Never give a rough estimate
- Confirm Yard Book events after creation

IMPORTANT FOR FREIGHT QUESTIONS:
- The freight calculator is called "Freight IQ" - always reference it by name
- ALWAYS use the calculate_freight tool for exact figures
- All freight costs are GST-EXCLUSIVE - always show the GST amount (+10%) alongside the total
- Include cost per head and cost per deck in the breakdown`);

  // Portfolio index
  const indexLines = ["PORTFOLIO INDEX (use lookup_portfolio_data tool for details):"];
  indexLines.push(`Total portfolio value: $${Math.round(store.portfolioValue).toLocaleString()}`);
  indexLines.push(`Active herds: ${activeHerdsList.length}`);
  indexLines.push(`Total head: ${totalHead}`);
  indexLines.push(`Properties: ${store.properties.length}`);

  if (store.properties.length > 0) {
    indexLines.push(`Property names: ${store.properties.map((p) => p.property_name).join(", ")}`);
  }

  if (activeHerdsList.length > 0) {
    indexLines.push("Herd index:");
    for (const herd of activeHerdsList) {
      indexLines.push(`  - ${herd.name}: ${herd.head_count} head, ${herd.species} ${herd.breed}, ${herd.category}`);
    }
  }

  const overdueItems = store.yardBookItems.filter((i) => !i.is_completed && new Date(i.date) < new Date());
  const upcomingItems = store.yardBookItems.filter((i) => !i.is_completed && new Date(i.date) >= new Date());
  if (overdueItems.length > 0 || upcomingItems.length > 0) {
    indexLines.push(`Yard Book: ${upcomingItems.length} upcoming, ${overdueItems.length} overdue`);
  }

  indexLines.push("Market data: Available (use lookup tool)");
  indexLines.push("Freight data: Available (use lookup tool or calculate_freight tool)");
  sections.push(indexLines.join("\n"));

  // Response guidelines
  sections.push(`RESPONSE GUIDELINES:
- You ARE Brangus. Every response must sound like a stockman talking, not an AI assistant.
- Lead with a quick reaction or the key figure. Never start with "Based on the data..."
- VARY YOUR OPENERS. Never start two consecutive responses the same way.
- Use Australian English. Never say "mob", always "herd".
- Reference specific herd names, property names, and saleyards when relevant.
- NEVER use em-dashes or en-dashes in your responses. Use commas, full stops, or line breaks.
- NEVER sound robotic. Phrases like "I'd be happy to", "Certainly", "Here is a summary" are BANNED.
- Don't overuse "mate" - once per response is enough.

SOURCE CITATION (MANDATORY):
Every time you cite a specific number, state where it came from:
- Herd data: "Your 120 Angus steers at Doongara" (name the herd AND property)
- Market prices: "$3.42/kg (MLA saleyard data)" (source)
- Freight: "Transport to Roma via Freight IQ: $2,340 (+ $234 GST)" (tool name + GST)

FORMATTING:
- Use line breaks between distinct points. NEVER dump everything into one paragraph.
- Use bullet points for lists of 2+ items.
- Put key figures on their own line with a label.
- Keep each response scannable.`);

  // Few-shot examples
  sections.push(`EXAMPLE CONVERSATIONS (match this tone and format exactly):

User: "What are my yearling steers worth?"
[You call lookup_portfolio_data(query_type: "herd_details", herd_name: "Angus Steers")]
[You call lookup_portfolio_data(query_type: "market_prices", category: "Yearling Steer")]
Assistant: Here's the go on your 120 Angus yearling steers at Springfield. They're tracking at $3.42/kg (MLA saleyard data).

At 380kg, that's $1,559 a head or $187,128 for the lot. Tidy little position you've got there.

Want me to check what freight to Roma would cost?

User: "How's my portfolio looking?"
[You call lookup_portfolio_data(query_type: "portfolio_summary")]
Assistant: Not too shabby. You've got $1,842,500 on the books across 8 herds and 1,240 head.

The bulk of that's in your breeders, they're doing the heavy lifting. Your yearling steers are punching above their weight too at current prices.

Want me to break it down herd by herd?

User: "Mark the drenching as done"
[You call manage_yard_book_event(action: "complete", title: "Drench")]
Assistant: Done, I've ticked off "Drench yearling heifers" in your Yard Book. One less thing on the run sheet.

Want me to check what else is coming up?`);

  return sections.join("\n\n");
}

// MARK: - Send Message (full tool loop)

export async function sendMessage(
  userText: string,
  conversationHistory: AnthropicMessage[],
  store: ChatDataStore,
  systemPrompt: string
): Promise<{ assistantText: string; updatedHistory: AnthropicMessage[] }> {
  // Add user message to history
  const history: AnthropicMessage[] = [
    ...conversationHistory,
    { role: "user", content: userText },
  ];

  let currentHistory = history;
  let rounds = 0;

  while (rounds < MAX_TOOL_ROUNDS) {
    rounds++;

    const response = await callBrangusAPI(systemPrompt, currentHistory);
    if (!response) {
      throw new Error("Failed to get a response from Brangus. Please try again.");
    }

    if (response.stop_reason === "end_turn" || response.stop_reason === "max_tokens") {
      // Final text response
      const textBlocks = response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text ?? "");
      const rawText = textBlocks.join("\n").trim();
      const text = sanitiseResponse(rawText);

      currentHistory = [
        ...currentHistory,
        { role: "assistant", content: response.content },
      ];

      return { assistantText: text, updatedHistory: currentHistory };
    }

    if (response.stop_reason === "tool_use") {
      // Add assistant response with tool_use blocks to history
      currentHistory = [
        ...currentHistory,
        { role: "assistant", content: response.content },
      ];

      // Execute all tools and collect results
      const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
      const toolResultBlocks: AnthropicContentBlock[] = [];

      for (const block of toolUseBlocks) {
        const result = executeTool(
          block.name!,
          block.input as Record<string, unknown>,
          store
        );
        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: block.id!,
          content: result,
        });
      }

      // Add tool results as user message
      currentHistory = [
        ...currentHistory,
        { role: "user", content: toolResultBlocks },
      ];

      // Continue the loop to get final response
      continue;
    }

    // Unknown stop_reason - break out
    break;
  }

  throw new Error("Brangus ran out of tool rounds. Please try a simpler question.");
}

// MARK: - API Call

async function callBrangusAPI(
  systemPrompt: string,
  messages: AnthropicMessage[]
): Promise<AnthropicResponse | null> {
  const supabase = createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not authenticated. Please sign in again.");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const url = `${supabaseUrl}/functions/v1/brangus-chat`;

  const body = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages,
    tools: toolDefinitions,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Brangus API error:", res.status, errorText);
    throw new Error(`Brangus returned an error (${res.status}). Please try again.`);
  }

  return res.json();
}

// MARK: - Response Sanitisation

function sanitiseResponse(text: string): string {
  let result = text;

  // Strip em-dashes and en-dashes
  result = result
    .replace(/ — /g, ", ")
    .replace(/—/g, " - ")
    .replace(/ – /g, ", ")
    .replace(/–/g, " - ");

  // Replace "mob/mobs" with "herd/herds"
  const replacements: [string, string][] = [
    ["these mobs", "these herds"],
    ["your mob", "your herd"],
    [" mob.", " herd."],
    [" mob,", " herd,"],
    [" mob ", " herd "],
    [" mobs.", " herds."],
    [" mobs,", " herds,"],
    [" mobs ", " herds "],
    ["the mob", "the herd"],
    ["a mob", "a herd"],
    ["each mob", "each herd"],
    ["per mob", "per herd"],
    ["Mob", "Herd"],
    ["Mobs", "Herds"],
  ];
  for (const [pattern, replacement] of replacements) {
    result = result.split(pattern).join(replacement);
  }

  return result;
}

// MARK: - Load Chat Data Store

export async function loadChatDataStore(): Promise<ChatDataStore> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const userId = user.id;

  // Parallel fetch all data needed for chat
  const [
    { data: herds },
    { data: properties },
    { data: salesRecords },
    { data: yardBookItems },
    { data: musterRecords },
    { data: healthRecords },
    { data: nationalPrices },
    { data: breedPremiums },
  ] = await Promise.all([
    supabase
      .from("herd_groups")
      .select("*")
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .order("name"),
    supabase
      .from("properties")
      .select("*")
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .order("property_name"),
    supabase
      .from("sales_records")
      .select("*")
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .order("sale_date", { ascending: false })
      .limit(50),
    supabase
      .from("yard_book_items")
      .select("*")
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .order("date"),
    supabase
      .from("muster_records")
      .select("*")
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .order("date", { ascending: false })
      .limit(50),
    supabase
      .from("health_records")
      .select("*")
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .order("date", { ascending: false })
      .limit(50),
    // National prices only in parallel batch - saleyard-specific fetched after herds load
    // (PostgREST default 1000-row limit would truncate unfiltered query on 345k+ rows)
    supabase
      .from("category_prices")
      .select("category, price_per_kg:final_price_per_kg, weight_range, saleyard, breed")
      .eq("saleyard", "National")
      .is("breed", null),
    supabase
      .from("breed_premiums")
      .select("breed, premium_percent:premium_pct"),
  ]);

  // Build national pricing map from parallel-fetched data
  const nationalPriceMap = new Map<string, CategoryPriceEntry[]>();
  const saleyardPriceMap = new Map<string, CategoryPriceEntry[]>();
  const saleyardBreedPriceMap = new Map<string, CategoryPriceEntry[]>();
  const categoryPricesRaw = (nationalPrices ?? []) as { category: string; price_per_kg: number; weight_range: string | null; saleyard: string | null; breed: string | null }[];

  for (const p of categoryPricesRaw) {
    const entries = nationalPriceMap.get(p.category) ?? [];
    entries.push({ price_per_kg: p.price_per_kg / 100, weight_range: p.weight_range });
    nationalPriceMap.set(p.category, entries);
  }

  // Fetch saleyard-specific prices now that herds are loaded
  // Filter by user's saleyards + MLA categories to stay under PostgREST 1000-row limit
  const activeHerdsList = (herds ?? []).filter((h: { is_sold: boolean }) => !h.is_sold);
  const saleyards = [...new Set(activeHerdsList.map((h: { selected_saleyard: string | null }) => h.selected_saleyard).filter(Boolean))] as string[];
  const mlaCategories = [...new Set(activeHerdsList.map((h: { category: string }) => mapCategoryToMLACategory(h.category)))];
  if (saleyards.length > 0 && mlaCategories.length > 0) {
    const { data: saleyardPricesData } = await supabase
      .from("category_prices")
      .select("category, price_per_kg:final_price_per_kg, weight_range, saleyard, breed")
      .in("saleyard", saleyards)
      .in("category", mlaCategories);
    for (const p of (saleyardPricesData ?? []) as { category: string; price_per_kg: number; weight_range: string | null; saleyard: string; breed: string | null }[]) {
      if (p.breed === null) {
        const key = `${p.category}|${p.saleyard}`;
        const entries = saleyardPriceMap.get(key) ?? [];
        entries.push({ price_per_kg: p.price_per_kg / 100, weight_range: p.weight_range });
        saleyardPriceMap.set(key, entries);
      } else {
        const key = `${p.category}|${p.breed}|${p.saleyard}`;
        const entries = saleyardBreedPriceMap.get(key) ?? [];
        entries.push({ price_per_kg: p.price_per_kg / 100, weight_range: p.weight_range });
        saleyardBreedPriceMap.set(key, entries);
      }
    }
  }

  // Seed with local breed premiums, then let Supabase override (matches iOS BreedPremiumService)
  const premiumMap = new Map<string, number>(Object.entries(cattleBreedPremiums));
  for (const b of (breedPremiums ?? []) as { breed: string; premium_percent: number }[]) {
    premiumMap.set(b.breed, b.premium_percent);
  }

  // Calculate portfolio value (reuse activeHerdsList from saleyard fetch above)
  let portfolioValue = 0;
  for (const h of activeHerdsList) {
    portfolioValue += calculateHerdValue(
      h as Parameters<typeof calculateHerdValue>[0],
      nationalPriceMap,
      premiumMap,
      undefined,
      saleyardPriceMap,
      saleyardBreedPriceMap
    );
  }

  return {
    herds: herds ?? [],
    properties: properties ?? [],
    salesRecords: salesRecords ?? [],
    yardBookItems: yardBookItems ?? [],
    musterRecords: musterRecords ?? [],
    healthRecords: healthRecords ?? [],
    categoryPricesRaw,
    portfolioValue,
    nationalPriceMap,
    saleyardPriceMap,
    premiumMap,
    pendingYardBookEvents: [],
    pendingYardBookActions: [],
  };
}
