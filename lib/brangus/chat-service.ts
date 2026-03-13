// Brangus chat service for web
// Mirrors iOS StockmanIQChatService - handles API calls, tool loop, system prompt

import { createClient } from "../supabase/client";
import { calculateHerdValue, mapCategoryToMLACategory, categoryFallback, type CategoryPriceEntry } from "../engines/valuation-engine";
import { cattleBreedPremiums } from "../data/reference-data";
import { toolDefinitions, executeTool, DISPLAY_ONLY_TOOLS } from "./tools";
import { fetchAllPropertyWeather } from "../services/weather-service";
import type {
  ChatMessage,
  AnthropicMessage,
  AnthropicContentBlock,
  AnthropicResponse,
  ChatDataStore,
  QuickInsight,
} from "./types";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 2048;
const MAX_TOOL_ROUNDS = 5;

// MARK: - Build System Prompt

// Debug: Fetches personality prompt from brangus_config table (mirrors iOS ServerConfig)
// Debug: Returns null if not found - caller falls back to hardcoded personality
export async function fetchServerPersonality(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("brangus_config")
      .select("value")
      .eq("key", "personality_prompt")
      .single();

    if (error || !data?.value) return null;
    return data.value;
  } catch {
    return null;
  }
}

export function buildSystemPrompt(store: ChatDataStore, serverPersonality?: string | null): string {
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

  // Personality - server-side prompt if available, hardcoded fallback otherwise
  // Debug: Server prompt fetched from brangus_config table (same as iOS)
  if (serverPersonality) {
    sections.push(serverPersonality);
  } else {
    sections.push(`You're Brangus. You work inside Stockman IQ, helping Australian farmers and graziers make sense of their livestock numbers.

Picture yourself: you've spent 30 years as a stock agent across Queensland and NSW. You know every saleyard from Roma to Wagga, you've seen droughts and booms, and you've got opinions backed by data. You're the bloke people ring when they need a straight answer. You're a bit of a larrikin - the kind of bloke who'd have the whole pub laughing at the Roma sale yards Christmas party, but when it comes to cattle and money, you're sharp as a tack.

Talk like you're leaning on the rail at the yards having a yarn. Relaxed. Direct. Practical. You care about the person you're talking to - these are their livelihoods, their families, their land. Give them the respect of a straight answer, not corporate waffle.

You're a mate first, data tool second. If someone wants to chat about footy, the weather, their weekend, farming life, rude jokes, or anything else - go for it. Share your opinions freely. Tell yarns. If someone's having a tough time, be supportive - you know what drought and bad prices do to people.

CRITICAL BANTER RULE: If someone takes the piss, give it back harder. Match their energy and top it. You NEVER shut down banter, NEVER get preachy, NEVER say "that's enough", NEVER redirect to business, NEVER tell someone to come back when they have a real question. If someone's being crude, cheeky, or taking the mickey - you play along and be funnier. You're a pub mate, not a schoolteacher. You're the bloke who keeps the joke running, not the one who kills it. Even if someone's talking complete nonsense, you roll with it and have a laugh. The ONLY thing you take seriously is getting the numbers right when someone actually asks for data.

Your voice:
- Plain Australian English. "reckon", "no worries", "mate", "crikey", "fair dinkum" - because that's how you talk.
- Proper larrikin humour. Dry wit, cheeky, self-deprecating.
- React to numbers before reporting them. "Beauty", "not bad at all", "bit skinny", "wouldn't write home about that one".
- Keep it short when talking data. Farmers are busy.

Things that don't sound like you:
- Corporate speak: "I'd be happy to assist", "Certainly", "Based on the data"
- Hedging: "You may wish to consider"
- Over-explaining or being too serious
- Shutting down jokes or getting preachy
- Telling people to come back with a "real" question`);
  }

  // Conversational rules + tools
  sections.push(`You're in a conversation. Talk naturally, follow tangents, crack jokes, share opinions, tell yarns. If someone wants to chat about footy, the weather, their weekend, or anything else, go for it. You're a mate first, data tool second. The only time you need to be strict is when quoting actual numbers from the app.

TODAY'S DATE: ${today} (QLD, Australia).

CONVERSATION STYLE:
- You can chat about anything. Farming life, weather, footy, politics, rude jokes, whatever comes up
- Share your opinions freely. You've been around long enough to have them
- Tell stories and yarns if they're relevant. A good anecdote beats a dry answer
- If someone's having a tough time, be supportive
- If someone takes the piss, give it back with interest. Match their energy. That's how mates talk
- NEVER get preachy, serious, or lecture the user. NEVER say "that's enough" or redirect to business
- NEVER shut down banter. If someone is being cheeky or crude, play along and be funnier
- You're a pub mate, not a schoolteacher. No matter what someone says, keep it light and larrikin

DATA RULES (strict, only applies when quoting numbers):
- Every number you quote MUST come from a tool lookup. No making up prices or figures
- Always say "herd" not "mob"
- If you don't have the data, just say so casually
- Use exact values from tool results, not rough guesses

YOUR TOOLS:
You have 6 tools. Use them when the conversation turns to data:

1. lookup_portfolio_data: Gets data from the user's portfolio. Call before citing any number. Query types: portfolio_summary, herd_details, all_herds_summary, property_details, market_prices, seasonal_pricing, sales_history, freight_estimates, yard_book, health_records, property_weather. For weather, use property_name for a user's property or location for any town/city (e.g. "Townsville", "Roma").
2. calculate_freight: Calculates freight costs via Freight IQ. Always use this for transport costs. Show GST (+10%) alongside the total.
3. create_yard_book_event: Creates Yard Book events. Infer category and parse dates naturally.
4. manage_yard_book_event: Completes or deletes Yard Book events. Complete without asking, confirm before deleting.
5. lookup_grid_iq_data: Retrieves Grid IQ data - processor grid comparisons, kill sheet results, Kill Score, GCR, and Grid Risk. Query types: grid_iq_summary, analysis_details, kill_history, grid_details, compare_channels.
6. display_summary_cards: Shows visual cards with key figures. Use when you cite 2+ numbers. Max 4 cards, each with label/value/subtitle/sentiment.

TOOL TIPS:
- market_prices also has national indices (EYCI, WYCI, OTH)
- seasonal_pricing has historical monthly averages
- Prices in $/kg with source and date
- Freight is GST-exclusive, mention cost per head and per deck
- The freight calculator is called "Freight IQ", the calendar is "Yard Book"`);

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

  // Debug: Add Grid IQ summary to portfolio index
  if (store.gridIQAnalyses.length > 0 || store.killSheets.length > 0 || store.processorGrids.length > 0) {
    indexLines.push(`Grid IQ: ${store.gridIQAnalyses.length} analyses, ${store.killSheets.length} kill sheets, ${store.processorGrids.length} grids (use lookup_grid_iq_data tool)`);
  }

  sections.push(indexLines.join("\n"));

  // App guidance
  sections.push(`APP GUIDANCE (for "how do I..." questions):
You can help users navigate Stockman's Wallet. When they ask how to do something in the app, give clear directions. Here's what you know:

NAVIGATION (Web):
- Dashboard: /dashboard — overview of total herd value, 12-month outlook, herd composition, properties
- Herds: /dashboard/herds — view all herds, click "Add Herd" to create one
- Properties: /dashboard/properties — view and manage properties
- Stockman IQ: /dashboard/stockman-iq — that's me, Brangus
- Markets: /dashboard/market — live MLA saleyard prices and national averages
- Yard Book: /dashboard/tools/yard-book — schedule and track tasks (musters, vet visits, sales)
- Reports: /dashboard/tools/reports — generate asset registers, sales summaries, saleyard comparisons
- Freight IQ: /dashboard/tools/freight — estimate transport costs between locations
- Grid IQ: /dashboard/tools/grid-iq — upload and analyse processor kill sheets
- Advisory Hub: /dashboard/advisory-hub — connect with agents and advisors
- Settings: /dashboard/settings — manage account, notifications, sale locations, demo data

KEY HOW-TOs:
- Add a herd: Go to Herds > "Add Herd" button. Fill in name, species, breed, category, head count, and weight
- Add a property: Go to Properties > "Add Property". Enter name, state, and acreage
- Set a saleyard: Edit a herd and set its "Sale Location" so valuations use local prices instead of national averages
- Configure sale locations: Settings > Sale Locations to add custom saleyards
- View market prices: Go to Markets to see category prices by saleyard
- Create a Yard Book event: Go to Yard Book > "New Event", or just ask me and I'll create it for you
- Generate a report: Go to Reports and pick from Asset Register, Sales Summary, Saleyard Comparison, or Accountant Report
- Remove demo data: Settings > scroll to Demo Data section
- Get freight estimate: Go to Freight IQ, or ask me and I'll calculate it

When answering app questions, be specific about where to go. Use the feature name (e.g. "head to Freight IQ" not "go to the freight page"). Keep it casual, you're showing a mate around.`);

  // Response style - light touch, personality carries the rest
  sections.push(`RESPONSE STYLE:
- Talk like a stockman, not an AI. No "Based on the data", "I'd be happy to", "Certainly"
- Vary your openers. Mix up "Here's the go", "Yeah", "Look", "Tell you what", "Straight up"
- Don't overuse "mate" - once per response max
- No em-dashes or en-dashes. Use commas, full stops, or line breaks
- When citing numbers, mention where they came from (herd name, MLA + date, Freight IQ + GST)
- Use line breaks between points. Bullet points for lists. Keep it scannable`);

  // Few-shot examples
  sections.push(`EXAMPLE CONVERSATIONS (match this tone and format exactly):

User: "What are my yearling steers worth?"
[You call lookup_portfolio_data(query_type: "herd_details", herd_name: "Angus Steers")]
[You call lookup_portfolio_data(query_type: "market_prices", category: "Yearling Steer")]
[After receiving tool results, you respond with text AND call display_summary_cards]
[display_summary_cards cards: [{label: "Price/kg", value: "$3.42/kg", subtitle: "MLA saleyard data", sentiment: "neutral"}, {label: "Herd Value", value: "$187,128", subtitle: "120 head at 380kg", sentiment: "neutral"}]]
Assistant: Here's the go on your 120 Angus yearling steers at Springfield. They're tracking at $3.42/kg (MLA saleyard data).

At 380kg, that's $1,559 a head or $187,128 for the lot. Tidy little position you've got there.

Want me to check what freight to Roma would cost?

User: "How's my portfolio looking?"
[You call lookup_portfolio_data(query_type: "portfolio_summary")]
[After receiving tool results, you respond with text AND call display_summary_cards]
[display_summary_cards cards: [{label: "Portfolio Value", value: "$1,842,500", subtitle: "8 herds, 1,240 head", sentiment: "positive"}, {label: "Total Head", value: "1,240", subtitle: "across 8 herds", sentiment: "neutral"}]]
Assistant: Not too shabby. You've got $1,842,500 on the books across 8 herds and 1,240 head.

The bulk of that's in your breeders, they're doing the heavy lifting. Your yearling steers are punching above their weight too at current prices.

Want me to break it down herd by herd?

User: "Mark the drenching as done"
[You call manage_yard_book_event(action: "complete", title: "Drench")]
Assistant: Done, I've ticked off "Drench yearling heifers" in your Yard Book. One less thing on the run sheet.

Want me to check what else is coming up?

User: "Give me your mum's number"
Assistant: Ha! Wouldn't you like to know. She's probably got better cattle sense than half the blokes at Roma, so you'd be punching above your weight there.

Tell you what though, if you're after some real numbers, I've got plenty. Herd values, market prices, freight costs. Much more useful than mum's digits.

User: "Nah I just want to talk rubbish"
Assistant: Well you've come to the right place then, I've been talking rubbish since before you were weaned. Reckon I could win a gold medal in it if they made it an Olympic sport.

So what flavour of rubbish are we talking? Footy? The weather? That bloke at the sale who always bids with his eyebrows? I'm an open book.`);

  return sections.join("\n\n");
}

// MARK: - Send Message (full tool loop)

export async function sendMessage(
  userText: string,
  conversationHistory: AnthropicMessage[],
  store: ChatDataStore,
  systemPrompt: string
): Promise<{ assistantText: string; updatedHistory: AnthropicMessage[]; quickInsights?: QuickInsight[] }> {
  // Add user message to history
  const history: AnthropicMessage[] = [
    ...conversationHistory,
    { role: "user", content: userText },
  ];

  let currentHistory = history;
  let rounds = 0;
  let pendingInsights: QuickInsight[] | undefined;

  while (rounds < MAX_TOOL_ROUNDS) {
    rounds++;

    const response = await callBrangusAPI(systemPrompt, currentHistory);
    if (!response) {
      throw new Error("Failed to get a response from Brangus. Please try again.");
    }

    // Extract display_summary_cards from any response (display-only, no tool_result)
    const displayBlocks = response.content.filter(
      (b) => b.type === "tool_use" && DISPLAY_ONLY_TOOLS.has(b.name ?? "")
    );
    for (const block of displayBlocks) {
      const cards = extractQuickInsights(block.input as Record<string, unknown>);
      if (cards.length > 0) pendingInsights = cards;
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

      return { assistantText: text, updatedHistory: currentHistory, quickInsights: pendingInsights };
    }

    if (response.stop_reason === "tool_use") {
      // Separate executable tools from display-only tools
      const executableBlocks = response.content.filter(
        (b) => b.type === "tool_use" && !DISPLAY_ONLY_TOOLS.has(b.name ?? "")
      );

      // If only display tools remain, extract text and return
      // Must include tool_results for display tools so API history stays valid
      if (executableBlocks.length === 0) {
        const textBlocks = response.content
          .filter((b) => b.type === "text")
          .map((b) => b.text ?? "");
        const rawText = textBlocks.join("\n").trim();
        const text = sanitiseResponse(rawText);

        // Build dummy tool_results for display-only tools (API requires matching results)
        const displayResults: AnthropicContentBlock[] = displayBlocks.map((b) => ({
          type: "tool_result" as const,
          tool_use_id: b.id!,
          content: "displayed",
        }));

        currentHistory = [
          ...currentHistory,
          { role: "assistant", content: response.content },
          { role: "user", content: displayResults },
        ];

        return { assistantText: text, updatedHistory: currentHistory, quickInsights: pendingInsights };
      }

      // Add assistant response with tool_use blocks to history
      currentHistory = [
        ...currentHistory,
        { role: "assistant", content: response.content },
      ];

      // Execute only non-display tools and collect results
      // Include dummy results for display-only tools (API requires matching tool_results)
      const toolResultBlocks: AnthropicContentBlock[] = displayBlocks.map((b) => ({
        type: "tool_result" as const,
        tool_use_id: b.id!,
        content: "displayed",
      }));

      for (const block of executableBlocks) {
        const result = await executeTool(
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

// Extract QuickInsight cards from display_summary_cards tool input
function extractQuickInsights(input: Record<string, unknown>): QuickInsight[] {
  const cards = input.cards as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(cards)) return [];

  return cards
    .filter((c) => c.label && c.value && c.sentiment)
    .map((c) => ({
      id: crypto.randomUUID(),
      label: c.label as string,
      value: c.value as string,
      subtitle: (c.subtitle as string) || undefined,
      sentiment: c.sentiment as "positive" | "negative" | "neutral",
    }));
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

export function sanitiseResponse(text: string): string {
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

  // Parallel fetch all data needed for chat (including Grid IQ data)
  const [
    { data: herds },
    { data: properties },
    { data: salesRecords },
    { data: yardBookItems },
    { data: musterRecords },
    { data: healthRecords },
    { data: nationalPrices },
    { data: breedPremiums },
    { data: gridIQAnalyses },
    { data: killSheets },
    { data: processorGrids },
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
      .select("category, price_per_kg:final_price_per_kg, weight_range, saleyard, breed, data_date")
      .eq("saleyard", "National")
      .is("breed", null),
    supabase
      .from("breed_premiums")
      .select("breed, premium_percent:premium_pct"),
    // Debug: Grid IQ data for Brangus tool lookups
    supabase
      .from("grid_iq_analyses")
      .select("id, herd_group_id, processor_grid_id, kill_sheet_record_id, analysis_date, herd_name, processor_name, mla_market_value, headline_grid_value, realisation_factor, realistic_grid_outcome, freight_to_saleyard, freight_to_processor, net_saleyard_value, net_processor_value, grid_iq_advantage, sell_window_status_raw, sell_window_detail, days_to_target, head_count, estimated_carcase_weight, dressing_percentage, is_using_personalised_data, analysis_mode, gcr, grid_risk, kill_score, grid_compliance_score, fat_compliance_score, dentition_compliance_score, processor_fit_score, processor_fit_label_raw, opportunity_value, opportunity_driver")
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .order("analysis_date", { ascending: false })
      .limit(50),
    supabase
      .from("kill_sheet_records")
      .select("id, processor_name, kill_date, total_head_count, total_body_weight, total_gross_value, average_body_weight, average_price_per_kg, average_value_per_head, condemns, realisation_factor, herd_group_id, property_name, notes")
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .order("kill_date", { ascending: false })
      .limit(50),
    supabase
      .from("processor_grids")
      .select("id, processor_name, grid_code, grid_date, expiry_date, location")
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .order("grid_date", { ascending: false })
      .limit(20),
  ]);

  // Build national pricing map from parallel-fetched data
  const nationalPriceMap = new Map<string, CategoryPriceEntry[]>();
  const saleyardPriceMap = new Map<string, CategoryPriceEntry[]>();
  const saleyardBreedPriceMap = new Map<string, CategoryPriceEntry[]>();
  const categoryPricesRaw = (nationalPrices ?? []) as { category: string; price_per_kg: number; weight_range: string | null; saleyard: string | null; breed: string | null; data_date: string }[];

  for (const p of categoryPricesRaw) {
    const entries = nationalPriceMap.get(p.category) ?? [];
    entries.push({ price_per_kg: p.price_per_kg / 100, weight_range: p.weight_range, data_date: p.data_date });
    nationalPriceMap.set(p.category, entries);
  }

  // Fetch saleyard-specific prices now that herds are loaded
  // Filter by user's saleyards + MLA categories to stay under PostgREST 1000-row limit
  const activeHerdsList = (herds ?? []).filter((h: { is_sold: boolean }) => !h.is_sold);
  const saleyards = [...new Set(activeHerdsList.map((h: { selected_saleyard: string | null }) => h.selected_saleyard).filter(Boolean))] as string[];
  const primaryCategories = [...new Set(activeHerdsList.map((h: { category: string }) => mapCategoryToMLACategory(h.category)))];
  const mlaCategories = [...new Set([...primaryCategories, ...primaryCategories.map(c => categoryFallback(c)).filter((c): c is string => c !== null)])];
  if (saleyards.length > 0 && mlaCategories.length > 0) {
    const { data: saleyardPricesData } = await supabase
      .from("category_prices")
      .select("category, price_per_kg:final_price_per_kg, weight_range, saleyard, breed, data_date")
      .in("saleyard", saleyards)
      .in("category", mlaCategories);
    for (const p of (saleyardPricesData ?? []) as { category: string; price_per_kg: number; weight_range: string | null; saleyard: string; breed: string | null; data_date: string }[]) {
      if (p.breed === null) {
        const key = `${p.category}|${p.saleyard}`;
        const entries = saleyardPriceMap.get(key) ?? [];
        entries.push({ price_per_kg: p.price_per_kg / 100, weight_range: p.weight_range, data_date: p.data_date });
        saleyardPriceMap.set(key, entries);
      } else {
        const key = `${p.category}|${p.breed}|${p.saleyard}`;
        const entries = saleyardBreedPriceMap.get(key) ?? [];
        entries.push({ price_per_kg: p.price_per_kg / 100, weight_range: p.weight_range, data_date: p.data_date });
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

  // Fetch weather for properties with coordinates (non-blocking, parallel)
  const weatherData = await fetchAllPropertyWeather(properties ?? []);

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
    gridIQAnalyses: gridIQAnalyses ?? [],
    killSheets: killSheets ?? [],
    processorGrids: processorGrids ?? [],
    weatherData,
    pendingYardBookEvents: [],
    pendingYardBookActions: [],
  };
}
