// Brangus tool definitions and execution for web
// Mirrors iOS StockmanIQChatService+ToolUse.swift and +DataLookup.swift

import { calculateHerdValuation, parseCalvesAtFoot, type CategoryPriceEntry, type HerdValuationResult } from "../engines/valuation-engine";
import { calculateFreightEstimate } from "../engines/freight-engine";
import { saleyardCoordinates } from "../data/reference-data";
import { resolveMLACategory } from "../data/weight-mapping";
import { fetchWeatherForLocation } from "../services/weather-service";
import { getRoadDistanceKm } from "../services/distance-service";
import { createClient } from "../supabase/client";
import type { ChatDataStore, QuickInsight } from "./types";

// MARK: - Tool Definitions (Anthropic tool_use format)

export const toolDefinitions = [
  {
    name: "lookup_portfolio_data",
    description:
      "Retrieves specific portfolio, market, weather, and operational data from the app. This is your PRIMARY tool - call it for ANY question about herds, properties, prices, market indices, freight, sales, weather, or the yard book. You MUST call this tool before citing any specific numbers (prices, weights, head counts, values, dates, temperatures) in your response. Herd valuations returned by this tool come straight from the AMV (Adjusted Market Value) engine and already include breed premium, projected weight (ADG accrual), pre-birth accrual, calves at foot, and mortality deduction. NEVER recompute these figures yourself - quote them as returned. If the user asks about weather, temperature, rain, forecast, or conditions at a property, use query_type 'property_weather'. Always look up data first. Never rely on the portfolio index alone.",
    input_schema: {
      type: "object",
      properties: {
        query_type: {
          type: "string",
          enum: [
            "portfolio_summary",
            "herd_details",
            "all_herds_summary",
            "property_details",
            "market_prices",
            "seasonal_pricing",
            "sales_history",
            "freight_estimates",
            "yard_book",
            "health_records",
            "property_weather",
          ],
          description: "What data to retrieve",
        },
        herd_name: {
          type: "string",
          description: "Specific herd name for herd_details, freight_estimates, health_records.",
        },
        category: {
          type: "string",
          description: "Livestock category for market_prices, seasonal_pricing (e.g. 'Yearling Steer')",
        },
        property_name: {
          type: "string",
          description: "Specific property name for property_details or property_weather",
        },
        location: {
          type: "string",
          description: "Any town, city, or place name for property_weather when not asking about a specific property (e.g. 'Townsville', 'Roma', 'Wagga Wagga')",
        },
        saleyard_override: {
          type: "string",
          description: "Optional MLA saleyard name (e.g. 'Roma', 'Armidale', 'Charters Towers'). Only use when the user explicitly asks to value a herd at a DIFFERENT saleyard than the one configured on the herd. Applies to query_type 'herd_details', 'all_herds_summary', and 'portfolio_summary'. Recomputes the AMV with that saleyard's price. Omit otherwise.",
        },
      },
      required: ["query_type"],
    },
  },
  {
    name: "calculate_freight",
    description:
      "Calculates exact freight costs using the app's Freight IQ engine. You MUST call this tool every time the user asks about freight, transport, or trucking costs, even for rough estimates. NEVER calculate freight yourself, NEVER estimate distances in your head, NEVER apply your own rate. The engine handles deck loading density, cow-and-calf pair detection, distance routing via OSRM, and GST. Prefer destination_saleyard (routes real road distance from the property to the saleyard) over distance_km (only a last resort when no saleyard matches). If the user specifies a rate different from the default, pass it via rate_per_deck_per_km. For breeder herds where the user says calves are at foot, set calves_at_foot=true so the engine uses the fixed 18 head/deck cow-calf density.",
    input_schema: {
      type: "object",
      properties: {
        herd_name: {
          type: "string",
          description:
            "Name of an existing herd from the portfolio. For breeders with calves at foot, the engine automatically counts cow-calf pairs (not total head).",
        },
        head_count: {
          type: "integer",
          description:
            "Number of head to transport. For cow-calf pairs, this is the number of PAIRS (cows), not total animals.",
        },
        average_weight_kg: { type: "number", description: "Average weight per head in kg." },
        category: { type: "string", description: "Livestock category." },
        sex: { type: "string", enum: ["Male", "Female"], description: "Sex of the livestock." },
        destination_saleyard: {
          type: "string",
          description:
            "Destination saleyard name. PREFERRED. The engine routes from the origin property to the saleyard using real road distances via OSRM. Always use this when the destination matches a known saleyard.",
        },
        distance_km: {
          type: "number",
          description:
            "Manual one-way road distance in km. Use ONLY as a last resort when no saleyard matches. Never guess this value, only pass a number the user explicitly gave you.",
        },
        rate_per_deck_per_km: {
          type: "number",
          description:
            "Optional carrier rate in dollars per deck per km. Use ONLY when the user explicitly specifies a non-default rate (e.g. '$2.75/deck/km', '$3 a k a deck'). If omitted, the engine uses the default rate.",
        },
        calves_at_foot: {
          type: "boolean",
          description:
            "Optional. Set to true when transporting breeders with calves at foot - the engine uses the fixed cow-calf density (18 head/deck). Set to false when the breeder herd is dry. Default true for Breeder category, ignored otherwise.",
        },
      },
      required: [],
    },
  },
  {
    name: "create_yard_book_event",
    description:
      "Creates a new event in the user's Yard Book. ONLY use when the user EXPLICITLY asks to add, create, schedule, or set a reminder.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short event title (max 60 chars)." },
        date: { type: "string", description: "Event date in YYYY-MM-DD format. MUST be derived from TODAY'S DATE in the system prompt. If the user says a day name (e.g. 'Monday'), count forward from today to find the exact date. Verify the day-of-week matches before submitting." },
        category: {
          type: "string",
          enum: ["Livestock", "Operations", "Finance", "Family", "Me"],
          description: "Event category.",
        },
        is_all_day: { type: "boolean", description: "Whether this is an all-day event. Default true." },
        notes: { type: "string", description: "Optional additional notes." },
        is_recurring: { type: "boolean", description: "Whether the event repeats. Default false." },
        recurrence_rule: {
          type: "string",
          enum: ["Weekly", "Fortnightly", "Monthly", "Annual"],
          description: "How often the event repeats.",
        },
        linked_herd_names: {
          type: "array",
          items: { type: "string" },
          description: "Names of herds to link this event to.",
        },
      },
      required: ["title", "date", "category"],
    },
  },
  {
    name: "manage_yard_book_event",
    description:
      "Marks a Yard Book event as complete or deletes it. Use when the user says 'mark X as done', 'complete X', 'tick off X', 'delete X', or 'remove X'.",
    input_schema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["complete", "delete"],
          description: "The action to perform.",
        },
        title: { type: "string", description: "The event title to match." },
      },
      required: ["action", "title"],
    },
  },
  {
    name: "lookup_grid_iq_data",
    description:
      "Retrieves Grid IQ analysis data including processor grid comparisons, kill sheet results, Kill Score, GCR (Grid Capture Ratio), and Grid Risk metrics. Use when the user asks about processor grids, kill sheets, Kill Score, GCR, grid performance, over-the-hooks results, or carcass data.",
    input_schema: {
      type: "object",
      properties: {
        query_type: {
          type: "string",
          enum: [
            "grid_iq_summary",
            "analysis_details",
            "kill_history",
            "grid_details",
            "compare_channels",
          ],
          description: "What Grid IQ data to retrieve.",
        },
        herd_name: {
          type: "string",
          description: "Herd name to filter analyses by.",
        },
        processor_name: {
          type: "string",
          description: "Processor name to filter by.",
        },
      },
      required: ["query_type"],
    },
  },
  {
    name: "display_summary_cards",
    description:
      "ALWAYS call this alongside your text response when you cite ANY specific numbers (prices, values, temperatures, head counts, weights, percentages, distances). Cards appear in a persistent strip the user scrolls through. Include weather readings (temp, conditions), portfolio values, prices, freight costs, head counts. Only skip this for greetings or pure text answers with zero numbers.",
    input_schema: {
      type: "object",
      properties: {
        cards: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string", description: "Short label, max 20 chars (e.g. 'Portfolio Value', 'Price/kg', 'Freight Cost')" },
              value: { type: "string", description: "The key figure (e.g. '$187,128', '$3.42/kg', '120 head')" },
              subtitle: { type: "string", description: "Brief context, max 30 chars (e.g. 'MLA saleyard data', '+ $234 GST')" },
              sentiment: { type: "string", enum: ["positive", "negative", "neutral"], description: "positive for gains/good news, negative for losses/warnings, neutral for facts" },
            },
            required: ["label", "value", "sentiment"],
          },
          maxItems: 4,
          minItems: 1,
        },
      },
      required: ["cards"],
    },
  },
  {
    name: "calculate_price_scenario",
    description:
      "Calculates the impact of a price change on the portfolio. Use when the user asks 'what if prices drop/rise by X', 'what would happen if the market moves', or any hypothetical pricing scenario. This does the maths server-side with the exact valuation formula. price_change_per_kg is in dollars (e.g. -0.20 for a 20c/kg drop, 0.50 for a 50c/kg rise).",
    input_schema: {
      type: "object",
      properties: {
        price_change_per_kg: {
          type: "number",
          description: "Price change in $/kg (e.g. -0.20 for a 20c drop, 0.50 for a 50c rise).",
        },
        herd_name: {
          type: "string",
          description: "Optional. Limit scenario to a single herd by name.",
        },
      },
      required: ["price_change_per_kg"],
    },
  },
  {
    name: "remember_fact",
    description:
      "Saves a personal fact about the user so you can remember it in future conversations. Use this when the user shares something personal worth remembering: their partner's or kids' names, significant events (droughts, floods, big sales), property quirks, preferences, or anything that makes them who they are. Do NOT save data that's already in their portfolio (herd counts, prices, property names). Save the human stuff - the things a good stock agent remembers about his clients.",
    input_schema: {
      type: "object",
      properties: {
        fact: {
          type: "string",
          description:
            "The fact to remember, written naturally. E.g. 'Partner is Sarah, they have two kids', 'Lost 30 head in the 2022 floods at Back Creek', 'Prefers to sell at Roma over Dalby'",
        },
        category: {
          type: "string",
          enum: ["personal", "property", "livestock", "preference", "history", "general"],
          description:
            "personal=family/relationships. property=land/location details. livestock=breed preferences/management style. preference=how they like to do things. history=significant past events. general=anything else.",
        },
      },
      required: ["fact", "category"],
    },
  },
  {
    name: "search_past_chats",
    description:
      "Searches previous conversations with this user. Use when they reference a past discussion, e.g. 'remember when we talked about...', 'what did you say about the heifers last time', 'we discussed freight costs a while back', 'last time I asked you about...'. Do NOT use this for every message. Only when the user clearly references something from a previous chat session.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "What to search for in past conversations. Use natural keywords, e.g. 'selling heifers', 'freight to Roma', 'drought'.",
        },
        max_results: {
          type: "integer",
          description:
            "Maximum results to return (1-15). Default 8. Use fewer for casual references, more for thorough lookups.",
        },
      },
      required: ["query"],
    },
  },
];

// Display-only tools (no tool_result sent back to API)
export const DISPLAY_ONLY_TOOLS = new Set(["display_summary_cards"]);

// MARK: - Tool Execution

export async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  store: ChatDataStore
): Promise<string> {
  switch (toolName) {
    case "lookup_portfolio_data":
      return executeLookup(input, store);
    case "calculate_freight":
      return executeFreight(input, store);
    case "create_yard_book_event":
      return executeCreateYardBookEvent(input, store);
    case "manage_yard_book_event":
      return executeManageYardBookEvent(input, store);
    case "lookup_grid_iq_data":
      return executeGridIQLookup(input, store);
    case "calculate_price_scenario":
      return executePriceScenario(input, store);
    case "remember_fact":
      return executeRememberFact(input);
    case "search_past_chats":
      return executeSearchPastChats(input);
    default:
      return `Error: Unknown tool '${toolName}'`;
  }
}

// MARK: - Lookup Tool

async function executeLookup(input: Record<string, unknown>, store: ChatDataStore): Promise<string> {
  const queryType = input.query_type as string;
  if (!queryType) return "Error: Missing query_type parameter.";

  // Debug: saleyard_override - user can ask for valuations at a non-default saleyard
  // (fixes BRG-001). Applies to herd_details, all_herds_summary, portfolio_summary.
  const saleyardOverrideRaw = input.saleyard_override;
  const saleyardOverride =
    typeof saleyardOverrideRaw === "string" && saleyardOverrideRaw.trim().length > 0
      ? saleyardOverrideRaw.trim()
      : null;

  switch (queryType) {
    case "portfolio_summary":
      return lookupPortfolioSummary(store, saleyardOverride);
    case "herd_details":
      return lookupHerdDetails(input.herd_name as string, store, saleyardOverride);
    case "all_herds_summary":
      return lookupAllHerdsSummary(store, saleyardOverride);
    case "property_details":
      return lookupPropertyDetails(input.property_name as string, store);
    case "market_prices":
      return lookupMarketPrices(input.category as string | undefined, store);
    case "seasonal_pricing":
      return lookupSeasonalPricing(input.category as string | undefined, store);
    case "sales_history":
      return lookupSalesHistory(store);
    case "freight_estimates":
      return lookupFreightEstimates(input.herd_name as string | undefined, store);
    case "yard_book":
      return lookupYardBook(store);
    case "health_records":
      return lookupHealthRecords(input.herd_name as string, store);
    case "property_weather":
      return await lookupPropertyWeather(input.property_name as string | undefined, input.location as string | undefined, store);
    default:
      return `Error: Unknown query_type '${queryType}'`;
  }
}

// MARK: - Valuation Helper
// Debug: Runs the AMV engine for a herd so the chat reports the same numbers as the
// Dashboard. When saleyardOverride is set and differs from the herd's configured
// saleyard, swaps selected_saleyard on a shallow copy so the engine resolves prices
// from the override yard. Mirrors iOS valuation(for:saleyardOverride:).
function valuationForHerd(
  herd: ChatDataStore["herds"][0],
  store: ChatDataStore,
  saleyardOverride: string | null
): HerdValuationResult {
  const overrideDiffers =
    !!saleyardOverride &&
    saleyardOverride.toLowerCase() !== (herd.selected_saleyard ?? "").toLowerCase();

  const input = overrideDiffers
    ? { ...herd, selected_saleyard: saleyardOverride }
    : herd;

  return calculateHerdValuation(
    input as Parameters<typeof calculateHerdValuation>[0],
    store.nationalPriceMap,
    store.premiumMap,
    undefined,
    store.saleyardPriceMap
  );
}

function fmtDollars(value: number): string {
  return Math.round(value).toLocaleString("en-AU");
}

function fmtPremium(herd: ChatDataStore["herds"][0], v: HerdValuationResult): string | null {
  if (!v.breedPremiumApplied || v.breedPremiumApplied === 0) return null;
  const sign = v.breedPremiumApplied >= 0 ? "+" : "";
  return `${sign}${v.breedPremiumApplied.toFixed(1)}% ${herd.breed}`;
}

// MARK: - Portfolio Summary
// Debug: Values come straight from the AMV engine (matches Dashboard). Never sum
// $/kg x weight in the chat layer - that was the root cause of BRG-010.
function lookupPortfolioSummary(store: ChatDataStore, saleyardOverride: string | null): string {
  const activeHerds = store.herds.filter((h) => !h.is_sold);
  const totalHead = activeHerds.reduce((sum, h) => sum + (h.head_count ?? 0), 0);

  let totalNet = 0;
  let totalBaseMarket = 0;
  let totalWeightGain = 0;
  let totalPreBirth = 0;
  let totalCalvesAtFoot = 0;
  let totalMortality = 0;

  for (const herd of activeHerds) {
    const v = valuationForHerd(herd, store, saleyardOverride);
    totalNet += v.netValue;
    totalBaseMarket += v.baseMarketValue;
    totalWeightGain += v.weightGainAccrual;
    totalPreBirth += v.preBirthAccrual;
    totalCalvesAtFoot += v.calvesAtFootValue;
    totalMortality += v.mortalityDeduction;
  }

  const lines = ["PORTFOLIO SUMMARY:"];
  if (saleyardOverride) {
    lines.push(`Saleyard override applied: ${saleyardOverride} (values recomputed)`);
  }
  lines.push(`Total portfolio value (Net Realizable, AMV engine): $${fmtDollars(totalNet)}`);
  lines.push(`  Base Market Value (initial weight x price): $${fmtDollars(totalBaseMarket)}`);
  lines.push(`  Weight Gain Accrual (ADG since added): $${fmtDollars(totalWeightGain)}`);
  if (totalPreBirth > 0) lines.push(`  Pre-Birth Accrual (breeders): $${fmtDollars(totalPreBirth)}`);
  if (totalCalvesAtFoot > 0) lines.push(`  Calves at Foot: $${fmtDollars(totalCalvesAtFoot)}`);
  lines.push(`  Mortality Deduction: -$${fmtDollars(totalMortality)}`);
  lines.push(`Active herds: ${activeHerds.length}`);
  lines.push(`Total head: ${totalHead}`);
  lines.push(`Properties: ${store.properties.length}`);

  const soldHerds = store.herds.filter((h) => h.is_sold);
  if (soldHerds.length > 0) {
    lines.push(`Previously sold herds: ${soldHerds.length}`);
  }

  return lines.join("\n");
}

// MARK: - Herd Details

// Debug: Emits the engine's HerdValuationResult directly - Brangus must not recompute
// it. When saleyardOverride differs from the herd's saleyard, engine is re-run.
function lookupHerdDetails(
  name: string | undefined,
  store: ChatDataStore,
  saleyardOverride: string | null
): string {
  if (!name) return "Error: Missing herd_name. Provide the herd name from the portfolio index.";

  const herd = findHerd(name, store.herds);
  if (!herd) {
    const available = store.herds.filter((h) => !h.is_sold).map((h) => h.name).join(", ");
    return `No herd found matching '${name}'. Available herds: ${available}`;
  }

  const lines = [`HERD DETAILS - ${herd.name}:`];
  lines.push(`Head count: ${herd.head_count}`);
  lines.push(`Species: ${herd.species}`);
  lines.push(`Breed: ${herd.breed}`);
  lines.push(`Category: ${herd.category}`);
  lines.push(`Sex: ${herd.sex}`);
  lines.push(`Age: ${herd.age_months} months`);
  lines.push(`Initial weight (as entered): ${Math.round(herd.initial_weight ?? herd.current_weight ?? 0)}kg`);

  if (herd.daily_weight_gain > 0) {
    lines.push(`Daily weight gain (DWG): ${herd.daily_weight_gain.toFixed(2)}kg/day`);
  }

  if (herd.selected_saleyard) lines.push(`Saleyard (configured): ${herd.selected_saleyard}`);

  // Debug: AMV block from the engine - Dashboard-matching numbers.
  const v = valuationForHerd(herd, store, saleyardOverride);
  lines.push("");
  lines.push("VALUATION (from AMV engine, matches Dashboard):");
  const overrideDiffers =
    !!saleyardOverride &&
    saleyardOverride.toLowerCase() !== (herd.selected_saleyard ?? "").toLowerCase();
  if (overrideDiffers) {
    lines.push(`Saleyard override applied: ${saleyardOverride} (recomputed, not cached)`);
  }
  lines.push(`Projected weight (ADG-adjusted to today): ${Math.round(v.projectedWeight)}kg`);
  lines.push(`Price (breed-adjusted, $/kg liveweight): $${v.pricePerKg.toFixed(3)}`);
  lines.push(`Price source: ${v.priceSource}${v.nearestSaleyardUsed ? ` (nearest: ${v.nearestSaleyardUsed})` : ""}`);
  if (v.dataDate) lines.push(`MLA data date: ${v.dataDate}`);
  const premium = fmtPremium(herd, v);
  lines.push(premium ? `Breed premium applied: ${premium}` : "Breed premium applied: none (price already breed-specific or no general base available)");
  lines.push(`Base Market Value (initial weight x price x head): $${fmtDollars(v.baseMarketValue)}`);
  lines.push(`Weight Gain Accrual (projected - initial): $${fmtDollars(v.weightGainAccrual)}`);
  if (v.preBirthAccrual > 0) lines.push(`Pre-Birth Accrual: $${fmtDollars(v.preBirthAccrual)}`);
  if (v.calvesAtFootValue > 0) lines.push(`Calves at Foot: $${fmtDollars(v.calvesAtFootValue)}`);
  lines.push(`Mortality Deduction: -$${fmtDollars(v.mortalityDeduction)}`);
  lines.push(`Net Realizable Value (herd total): $${fmtDollars(v.netValue)}`);
  if ((herd.head_count ?? 0) > 0) {
    lines.push(`Per head (Net / Head): $${fmtDollars(v.netValue / (herd.head_count ?? 1))}`);
  }
  lines.push("");

  if (herd.is_breeder) {
    const calvingPct = (herd.calving_rate > 1 ? herd.calving_rate : herd.calving_rate * 100);
    lines.push(`Breeder: Yes (calving rate: ${Math.round(calvingPct)}%)`);
    if (herd.is_pregnant) lines.push("Pregnant: Yes");
    if (herd.joined_date) lines.push(`Joined date: ${herd.joined_date}`);
  }

  if (herd.property_id) {
    const prop = store.properties.find((p) => p.id === herd.property_id);
    if (prop) lines.push(`Property: ${prop.property_name}`);
  }
  if (herd.paddock_name) lines.push(`Paddock: ${herd.paddock_name}`);
  if (herd.notes) lines.push(`Notes: ${herd.notes}`);
  lines.push(`Added: ${new Date(herd.created_at).toLocaleDateString("en-AU")}`);

  return lines.join("\n");
}

// MARK: - All Herds Summary
// Debug: Per-herd line now carries engine-sourced valuation (matches Dashboard).
function lookupAllHerdsSummary(store: ChatDataStore, saleyardOverride: string | null): string {
  const activeHerds = store.herds.filter((h) => !h.is_sold);
  if (activeHerds.length === 0) return "No active herds in portfolio.";

  const lines = [`ALL ACTIVE HERDS (${activeHerds.length}):`];
  if (saleyardOverride) {
    lines.push(`Saleyard override applied: ${saleyardOverride} (values recomputed)`);
  }
  lines.push("Values below come from the AMV engine (include breed premium, projected weight, accruals, mortality). Do not recompute.");

  let runningTotal = 0;
  for (const herd of activeHerds) {
    let line = `- ${herd.name}: ${herd.head_count} head`;
    line += `, ${herd.species} ${herd.breed}, ${herd.category}`;
    line += `, ${herd.sex}, ${herd.age_months} months`;
    line += `, initial ${Math.round(herd.initial_weight ?? herd.current_weight ?? 0)}kg`;
    if (herd.daily_weight_gain > 0) line += `, DWG ${herd.daily_weight_gain.toFixed(2)}kg/day`;
    if (herd.selected_saleyard) line += `, saleyard: ${herd.selected_saleyard}`;
    if (herd.is_breeder) line += ", breeder";

    const v = valuationForHerd(herd, store, saleyardOverride);
    const perHead = (herd.head_count ?? 0) > 0 ? v.netValue / (herd.head_count ?? 1) : 0;
    line += `, projected ${Math.round(v.projectedWeight)}kg`;
    line += `, $${v.pricePerKg.toFixed(3)}/kg (breed-adj)`;
    const premium = fmtPremium(herd, v);
    if (premium) line += ` [${premium}]`;
    line += `, $${fmtDollars(perHead)}/head, total $${fmtDollars(v.netValue)}`;
    if (v.dataDate) line += `, MLA ${v.dataDate}`;
    runningTotal += v.netValue;

    lines.push(line);
  }
  lines.push(`PORTFOLIO NET REALIZABLE TOTAL: $${fmtDollars(runningTotal)}`);
  return lines.join("\n");
}

// MARK: - Property Details

function lookupPropertyDetails(name: string | undefined, store: ChatDataStore): string {
  if (!name) {
    if (store.properties.length === 0) return "No properties configured.";
    const lines = [`ALL PROPERTIES (${store.properties.length}):`];
    for (const prop of store.properties) {
      lines.push(formatProperty(prop, store.herds));
    }
    return lines.join("\n");
  }

  const prop = store.properties.find(
    (p) => p.property_name.toLowerCase() === name.toLowerCase() ||
           p.property_name.toLowerCase().includes(name.toLowerCase())
  );
  if (!prop) {
    const available = store.properties.map((p) => p.property_name).join(", ");
    return `No property found matching '${name}'. Available: ${available}`;
  }
  return formatProperty(prop, store.herds);
}

function formatProperty(prop: ChatDataStore["properties"][0], herds: ChatDataStore["herds"]): string {
  const lines = [`PROPERTY - ${prop.property_name}:`];
  if (prop.property_pic) lines.push(`PIC: ${prop.property_pic}`);
  lines.push(`State: ${prop.state}`);
  if (prop.suburb) lines.push(`Suburb: ${prop.suburb}`);
  if (prop.region) lines.push(`Region: ${prop.region}`);
  if (prop.acreage && prop.acreage > 0) lines.push(`Acreage: ${Math.round(prop.acreage)} acres`);
  if (prop.default_saleyard) {
    let saleyardLine = `Default saleyard: ${prop.default_saleyard}`;
    if (prop.default_saleyard_distance && prop.default_saleyard_distance > 0) {
      saleyardLine += ` (${Math.round(prop.default_saleyard_distance)}km)`;
    }
    lines.push(saleyardLine);
  }
  if (prop.is_default) lines.push("Default property: Yes");

  const herdsOnProp = herds.filter((h) => !h.is_sold && h.property_id === prop.id);
  if (herdsOnProp.length > 0) {
    const headOn = herdsOnProp.reduce((sum, h) => sum + (h.head_count ?? 0), 0);
    lines.push(`Herds on property: ${herdsOnProp.length} (${headOn} head)`);
    for (const herd of herdsOnProp) {
      lines.push(`  - ${herd.name}: ${herd.head_count} head`);
    }
  }

  return lines.join("\n");
}

// MARK: - Market Prices

function lookupMarketPrices(category: string | undefined, store: ChatDataStore): string {
  const lines: string[] = [];
  lines.push("IMPORTANT: All prices below are in DOLLARS per kg ($/kg). Do NOT convert to cents.");

  // Determine which MLA categories to look up
  const mlaCat = category ? resolveMLACategory(category, 0).primaryMLACategory : null;
  const matchesCategory = (cat: string) => {
    if (!category) return true;
    const cl = category.toLowerCase();
    const catl = cat.toLowerCase();
    const mlal = mlaCat?.toLowerCase() ?? "";
    return catl.includes(cl) || cl.includes(catl) || catl.includes(mlal) || mlal.includes(catl);
  };

  // 1. Saleyard-specific prices (most relevant to user)
  if (store.saleyardPriceMap.size > 0) {
    const saleyardLines: string[] = [];
    for (const [key, entries] of store.saleyardPriceMap) {
      const [cat, saleyard] = key.split("|");
      if (!matchesCategory(cat)) continue;
      for (const e of entries) {
        const rangeLabel = e.weight_range ? ` (${e.weight_range}kg)` : "";
        const dateLabel = e.data_date ? ` [${e.data_date}]` : "";
        saleyardLines.push(`- ${cat}${rangeLabel} at ${saleyard}: $${e.price_per_kg.toFixed(2)}/kg${dateLabel}`);
      }
    }
    if (saleyardLines.length > 0) {
      lines.push("");
      lines.push("SALEYARD PRICES (specific to user's selected saleyards, MLA data):");
      lines.push(...saleyardLines);
    }
  }

  // 2. National averages (broader context)
  if (store.categoryPricesRaw.length > 0) {
    let filtered = store.categoryPricesRaw;
    if (category) {
      filtered = store.categoryPricesRaw.filter((p) => matchesCategory(p.category));
    }

    if (filtered.length > 0) {
      lines.push("");
      lines.push("NATIONAL AVERAGE PRICES (MLA national data):");
      const grouped = new Map<string, { price: number; range: string | null; date: string }[]>();
      for (const p of filtered) {
        const entries = grouped.get(p.category) ?? [];
        entries.push({ price: p.price_per_kg / 100, range: p.weight_range, date: p.data_date });
        grouped.set(p.category, entries);
      }
      for (const [cat, entries] of grouped) {
        for (const e of entries) {
          const rangeLabel = e.range ? ` (${e.range}kg)` : "";
          const dateLabel = e.date ? ` [${e.date}]` : "";
          lines.push(`- ${cat}${rangeLabel}: $${e.price.toFixed(2)}/kg${dateLabel}`);
        }
      }
    }
  }

  if (lines.length <= 1) {
    lines.push(category ? `No price data found for '${category}'.` : "CATEGORY PRICES: Market data unavailable.");
  } else {
    // Remind Brangus to prefer saleyard prices
    lines.push("");
    lines.push("NOTE: Always cite saleyard-specific prices when available. National averages are broader context only.");
  }

  return lines.join("\n");
}

// MARK: - Seasonal Pricing (simplified - returns current prices as proxy)

function lookupSeasonalPricing(category: string | undefined, store: ChatDataStore): string {
  if (store.seasonalData.length === 0) {
    return "SEASONAL PRICING: No seasonal data available. Market data may still be loading.";
  }

  const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Filter by category if provided (case-insensitive, also checks MLA-mapped name)
  let filtered = store.seasonalData;
  if (category && category.trim()) {
    const mlaCat = resolveMLACategory(category, 0).primaryMLACategory;
    filtered = store.seasonalData.filter((s) => {
      const cat = s.category.toLowerCase();
      const q = category.toLowerCase();
      const mla = mlaCat.toLowerCase();
      return cat.includes(q) || q.includes(cat) || cat.includes(mla) || mla.includes(cat);
    });
  }

  if (filtered.length === 0) {
    const available = store.seasonalData.map((s) => s.category).join(", ");
    return `No seasonal data for '${category}'. Available categories: ${available}`;
  }

  // Detect if all entries are fallback
  const allFallback = filtered.every((s) => s.isFallback);
  const lines: string[] = [];

  if (allFallback) {
    lines.push("SEASONAL PRICE PATTERNS (estimated monthly averages, $/kg):");
    lines.push("Based on typical Australian cattle market patterns. Real historical data not yet available.");
    lines.push("NOTE: These are estimates. Cite them as 'typical seasonal patterns' not 'MLA data'.");
  } else {
    lines.push("SEASONAL PRICE PATTERNS (historical monthly averages from 2020-2026, $/kg):");
    lines.push("Based on 6 years of MLA saleyard data.");
  }
  lines.push("INSTRUCTION: When the user asks about sale timing or historical prices, you MUST quote these specific monthly $/kg figures. Never give vague answers like 'historically prices tend to be higher' without citing the actual data below.");

  for (const entry of filtered) {
    let line = `- ${entry.category}:`;
    // Sort months and format
    const sorted = Object.entries(entry.monthlyAvg)
      .map(([m, v]) => ({ month: Number(m), price: v }))
      .sort((a, b) => a.month - b.month);
    const monthParts = sorted.map((s) => `${monthNames[s.month]}=$${s.price.toFixed(2)}`);
    line += " " + monthParts.join(", ");

    // Best and worst months with spread
    if (entry.bestMonth !== null) {
      const bestPrice = entry.monthlyAvg[entry.bestMonth];
      const worst = sorted.reduce((min, s) => (s.price < min.price ? s : min), sorted[0]);
      line += ` [BEST MONTH: ${monthNames[entry.bestMonth]} at $${bestPrice.toFixed(2)}/kg`;
      const spread = bestPrice - worst.price;
      line += `, WORST MONTH: ${monthNames[worst.month]} at $${worst.price.toFixed(2)}/kg`;
      line += `, SPREAD: $${spread.toFixed(2)}/kg]`;
    }
    lines.push(line);
  }

  return lines.join("\n");
}

// MARK: - Sales History

function lookupSalesHistory(store: ChatDataStore): string {
  if (store.salesRecords.length === 0) return "No sales records found.";

  const lines = [`SALES HISTORY (${store.salesRecords.length} records):`];
  for (const sale of store.salesRecords.slice(0, 20)) {
    let line = `- ${sale.sale_date}: ${sale.head_count} head`;
    if (sale.sale_location) line += ` at ${sale.sale_location}`;
    if (sale.total_sale_price) line += `, $${Math.round(sale.total_sale_price).toLocaleString()}`;
    if (sale.pricing_type === "per_kg" && sale.price_per_unit) {
      line += ` ($${sale.price_per_unit.toFixed(2)}/kg)`;
    }
    lines.push(line);
  }
  return lines.join("\n");
}

// MARK: - Freight Estimates

function lookupFreightEstimates(herdName: string | undefined, store: ChatDataStore): string {
  if (herdName) {
    const herd = findHerd(herdName, store.herds);
    if (!herd) return `No herd found matching '${herdName}'.`;

    const distanceKm = resolveDistance(herd, store.properties);
    if (!distanceKm || distanceKm <= 0) {
      return `FREIGHT for ${herd.name}: No distance available. Set a saleyard distance on the property to enable freight estimates.`;
    }

    // For breeders with calves at foot, use cow count only (each pair is one loading unit)
    const calfData = herd.category === "Breeder" ? parseCalvesAtFoot(herd.additional_info) : null;
    const freightHeadCount = calfData ? Math.max(1, herd.head_count - calfData.headCount) : herd.head_count;

    const estimate = calculateFreightEstimate({
      appCategory: herd.category,
      sex: herd.sex,
      averageWeightKg: herd.current_weight || herd.initial_weight,
      headCount: freightHeadCount,
      distanceKm,
    });

    const gst = estimate.totalCost * 0.1;
    const saleyardName = herd.selected_saleyard ?? "default saleyard";
    const lines = [`FREIGHT ESTIMATE - ${herd.name} to ${saleyardName}:`];
    lines.push(`Head: ${estimate.headCount}`);
    lines.push(`Weight: ${Math.round(estimate.averageWeightKg)}kg avg`);
    lines.push(`Category: ${estimate.freightCategory.displayName}`);
    lines.push(`Loading: ${estimate.headsPerDeck} head/deck`);
    lines.push(`Decks: ${estimate.decksRequired}`);
    lines.push(`Distance: ${Math.round(distanceKm)}km`);
    lines.push(`Total: $${Math.round(estimate.totalCost).toLocaleString()} (+ $${Math.round(gst)} GST)`);
    lines.push(`Per head: $${estimate.costPerHead.toFixed(2)}`);
    lines.push(`Per deck: $${Math.round(estimate.costPerDeck).toLocaleString()}`);
    if (estimate.efficiencyPrompt) lines.push(`Freight Efficiency: ${estimate.efficiencyPrompt}`);
    if (estimate.categoryWarning) lines.push(`Category Escalation: ${estimate.categoryWarning}`);
    return lines.join("\n");
  }

  // All herds freight summary
  const activeHerds = store.herds.filter((h) => !h.is_sold);
  if (activeHerds.length === 0) return "No active herds to estimate freight for.";

  const lines = ["FREIGHT ESTIMATES (all active herds):"];
  for (const herd of activeHerds) {
    const dist = resolveDistance(herd, store.properties);
    if (!dist || dist <= 0) {
      lines.push(`- ${herd.name}: No distance available`);
      continue;
    }
    // For breeders with calves at foot, use cow count only (each pair is one loading unit)
    const cd = herd.category === "Breeder" ? parseCalvesAtFoot(herd.additional_info) : null;
    const fhc = cd ? Math.max(1, herd.head_count - cd.headCount) : herd.head_count;
    const est = calculateFreightEstimate({
      appCategory: herd.category,
      sex: herd.sex,
      averageWeightKg: herd.current_weight || herd.initial_weight,
      headCount: fhc,
      distanceKm: dist,
    });
    const gst = est.totalCost * 0.1;
    lines.push(`- ${herd.name}: $${Math.round(est.totalCost).toLocaleString()} (+ $${Math.round(gst)} GST), ${est.decksRequired} deck(s), ${Math.round(dist)}km`);
  }
  return lines.join("\n");
}

// MARK: - Yard Book

function lookupYardBook(store: ChatDataStore): string {
  if (store.yardBookItems.length === 0) return "No Yard Book events found.";

  // Parse YYYY-MM-DD as local midnight (not UTC) to avoid date-shift in AEST
  const todayLocal = new Date();
  todayLocal.setHours(0, 0, 0, 0);
  const overdue = store.yardBookItems.filter((i) => {
    if (i.is_completed) return false;
    const [y, m, d] = i.event_date.split("T")[0].split("-").map(Number);
    return new Date(y, m - 1, d) < todayLocal;
  });
  const upcoming = store.yardBookItems.filter((i) => {
    if (i.is_completed) return false;
    const [y, m, d] = i.event_date.split("T")[0].split("-").map(Number);
    return new Date(y, m - 1, d) >= todayLocal;
  });
  const completed = store.yardBookItems.filter((i) => i.is_completed);

  const lines = ["YARD BOOK:"];

  if (overdue.length > 0) {
    lines.push(`\nOVERDUE (${overdue.length}):`);
    for (const item of overdue) {
      lines.push(`- ${item.title} (${item.event_date}, ${item.category_raw})`);
    }
  }
  if (upcoming.length > 0) {
    lines.push(`\nUPCOMING (${upcoming.length}):`);
    for (const item of upcoming.slice(0, 10)) {
      lines.push(`- ${item.title} (${item.event_date}, ${item.category_raw})`);
    }
  }
  if (completed.length > 0) {
    lines.push(`\nRECENTLY COMPLETED (${Math.min(completed.length, 5)}):`);
    for (const item of completed.slice(0, 5)) {
      lines.push(`- ${item.title} (${item.event_date}, ${item.category_raw})`);
    }
  }

  return lines.join("\n");
}

// MARK: - Health Records

function lookupHealthRecords(name: string | undefined, store: ChatDataStore): string {
  if (!name) {
    if (store.healthRecords.length === 0 && store.musterRecords.length === 0) {
      return "No health or muster records found.";
    }
    const lines = ["RECORDS SUMMARY:"];
    lines.push(`Muster records: ${store.musterRecords.length}`);
    lines.push(`Health records: ${store.healthRecords.length}`);
    return lines.join("\n");
  }

  const herd = findHerd(name, store.herds);
  if (!herd) return `No herd found matching '${name}'.`;

  const herdMusters = store.musterRecords.filter((r) => r.herd_id === herd.id);
  const herdHealth = store.healthRecords.filter((r) => r.herd_id === herd.id);

  const lines = [`RECORDS - ${herd.name}:`];
  if (herdMusters.length > 0) {
    lines.push(`\nMuster records (${herdMusters.length}):`);
    for (const r of herdMusters.slice(0, 5)) {
      lines.push(`- ${r.date}: ${r.head_count_observed ?? "?"} head observed`);
    }
  }
  if (herdHealth.length > 0) {
    lines.push(`\nHealth records (${herdHealth.length}):`);
    for (const r of herdHealth.slice(0, 5)) {
      lines.push(`- ${r.date}: ${r.treatment_type ?? "Treatment"} - ${r.notes ?? ""}`);
    }
  }
  if (herdMusters.length === 0 && herdHealth.length === 0) {
    lines.push("No records found for this herd.");
  }
  return lines.join("\n");
}

// MARK: - Property Weather

async function lookupPropertyWeather(propertyName: string | undefined, location: string | undefined, store: ChatDataStore): Promise<string> {
  // General location lookup (e.g. "Townsville", "Roma") - geocode and fetch on the fly
  if (location) {
    const weather = await fetchWeatherForLocation(location);
    if (!weather) {
      return `Couldn't find weather for '${location}'. Try a more specific place name (e.g. town or city).`;
    }
    return formatWeatherData(weather);
  }

  // Property-specific or all-properties lookup
  if (!store.weatherData || store.weatherData.length === 0) {
    const allProperties = store.properties;
    const withoutCoords = allProperties.filter((p) => p.latitude == null || p.longitude == null);
    if (withoutCoords.length > 0 && withoutCoords.length === allProperties.length) {
      return "Weather data unavailable - no properties have location coordinates set. The user needs to add latitude/longitude to their properties in Settings.";
    }
    return "Weather data is still loading or unavailable. Try asking again in a moment.";
  }

  // If property name given, find matching weather data
  if (propertyName) {
    const match = store.weatherData.find(
      (w) =>
        w.propertyName.toLowerCase() === propertyName.toLowerCase() ||
        w.propertyName.toLowerCase().includes(propertyName.toLowerCase()) ||
        propertyName.toLowerCase().includes(w.propertyName.toLowerCase())
    );

    if (!match) {
      const available = store.weatherData.map((w) => w.propertyName).join(", ");
      return `No weather data for property '${propertyName}'. Available: ${available}`;
    }

    return formatWeatherData(match);
  }

  // No property name - return all
  if (store.weatherData.length === 1) {
    return formatWeatherData(store.weatherData[0]);
  }

  return store.weatherData.map((w) => formatWeatherData(w)).join("\n\n---\n\n");
}

function formatWeatherData(data: { propertyName: string; locationDescription: string; temperature: number; feelsLike: number; humidity: number; windSpeed: number; windDirection: string; uvIndex: number; conditionDescription: string; dailyForecast: Array<{ date: Date; highTemp: number; lowTemp: number; precipitationChance: number; precipitationAmount: number; conditionDescription: string }>; alerts: Array<{ severity: string; summary: string }> }): string {
  const lines: string[] = [];

  lines.push(`PROPERTY WEATHER - ${data.propertyName} (${data.locationDescription}):`);
  lines.push("");

  // Current conditions
  lines.push("CURRENT CONDITIONS:");
  lines.push(`- ${data.temperature} degrees C (feels like ${data.feelsLike} degrees C), ${data.conditionDescription}`);
  lines.push(`- Humidity: ${data.humidity}%, Wind: ${data.windDirection} ${data.windSpeed}km/h`);

  const uvDesc = data.uvIndex <= 2 ? " (Low)" : data.uvIndex <= 5 ? " (Moderate)" : data.uvIndex <= 7 ? " (High)" : data.uvIndex <= 10 ? " (Very High)" : " (Extreme)";
  lines.push(`- UV Index: ${data.uvIndex}${uvDesc}`);

  // 7-day forecast
  if (data.dailyForecast.length > 0) {
    lines.push("");
    lines.push("7-DAY FORECAST:");
    for (const day of data.dailyForecast) {
      const dateStr = day.date.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
      let line = `- ${dateStr}: ${day.highTemp} degrees C / ${day.lowTemp} degrees C, ${day.conditionDescription}, ${day.precipitationChance}% rain`;
      if (day.precipitationAmount > 0.5) {
        line += ` (${Math.round(day.precipitationAmount)}mm)`;
      }
      lines.push(line);
    }
  }

  // Weather alerts
  if (data.alerts.length > 0) {
    lines.push("");
    lines.push("WEATHER ALERTS:");
    for (const alert of data.alerts) {
      lines.push(`- ${alert.severity}: ${alert.summary}`);
    }
  }

  return lines.join("\n");
}

// MARK: - Calculate Freight Tool

async function executeFreight(input: Record<string, unknown>, store: ChatDataStore): Promise<string> {
  let headCount: number;
  let weightKg: number;
  let category: string;
  let sex: string;
  let distanceKm: number;
  let calvesAtFoot: boolean | undefined;

  // Optional user-specified overrides validated against sane commercial bounds.
  const rawRate = input.rate_per_deck_per_km;
  let ratePerDeckPerKm: number | undefined;
  if (typeof rawRate === "number" && rawRate > 0 && rawRate <= 100) {
    ratePerDeckPerKm = rawRate;
  }

  const rawCalves = input.calves_at_foot;
  if (typeof rawCalves === "boolean") {
    calvesAtFoot = rawCalves;
  }

  const herdName = input.herd_name as string | undefined;
  if (herdName) {
    const herd = findHerd(herdName, store.herds);
    if (!herd) return `No herd found matching '${herdName}'.`;
    // For breeders with calves at foot, each cow-calf pair is one loading unit.
    // The 18 HPD cow_calf_units density already accounts for the calf, so count
    // pairs (cows only), not total head.
    const isBreeder = herd.category === "Breeder";
    const calfData = isBreeder ? parseCalvesAtFoot(herd.additional_info) : null;
    if (isBreeder) {
      headCount = calfData ? Math.max(1, herd.head_count - calfData.headCount) : herd.head_count;
    } else {
      headCount = herd.head_count;
    }
    // Default calves_at_foot: true if the herd record indicates calves at foot, otherwise let
    // the engine default apply (Breeder + calves_at_foot=true triggers the 18 HPD cow-calf band).
    if (calvesAtFoot === undefined && isBreeder) {
      calvesAtFoot = calfData !== null;
    }
    weightKg = herd.current_weight || herd.initial_weight;
    category = herd.category;
    sex = herd.sex;

    // Resolve distance - prefer saleyard routing, fall back to manual distance only when no saleyard.
    const destSaleyard = input.destination_saleyard as string | undefined;
    const manualDist = input.distance_km as number | undefined;
    if (destSaleyard) {
      distanceKm = await resolveDistanceToSaleyard(herd, store.properties, destSaleyard);
      if (!distanceKm || distanceKm <= 0) {
        // Routing failed for this saleyard; use the manual value if provided, otherwise saved default.
        if (manualDist && manualDist > 0) {
          distanceKm = manualDist;
        } else {
          const d = resolveDistance(herd, store.properties);
          if (!d || d <= 0) return `Could not route to '${destSaleyard}' from ${herd.name}. Provide a distance_km.`;
          distanceKm = d;
        }
      }
    } else if (manualDist && manualDist > 0) {
      distanceKm = manualDist;
    } else {
      const d = resolveDistance(herd, store.properties);
      if (!d || d <= 0) return `No distance available for ${herd.name}. Provide a destination_saleyard or distance_km.`;
      distanceKm = d;
    }
  } else {
    headCount = (input.head_count as number) ?? 0;
    weightKg = (input.average_weight_kg as number) ?? 0;
    category = (input.category as string) ?? "Yearling Steer";
    sex = (input.sex as string) ?? "Male";
    const manualDist = input.distance_km as number | undefined;
    const destSaleyard = input.destination_saleyard as string | undefined;
    if (destSaleyard) {
      distanceKm = await resolveDistanceToSaleyardFromProps(store.properties, destSaleyard);
      if ((!distanceKm || distanceKm <= 0) && manualDist && manualDist > 0) {
        distanceKm = manualDist;
      }
      if (!distanceKm || distanceKm <= 0) {
        return `Error: Could not route to '${destSaleyard}'. Provide a distance_km.`;
      }
    } else if (manualDist && manualDist > 0) {
      distanceKm = manualDist;
    } else {
      return "Error: Provide either distance_km or destination_saleyard.";
    }
  }

  if (headCount <= 0) return "Error: head_count must be > 0.";
  if (weightKg <= 0) return "Error: average_weight_kg must be > 0.";
  if (distanceKm <= 0) return "Error: Could not resolve distance.";

  const estimate = calculateFreightEstimate({
    appCategory: category,
    sex,
    averageWeightKg: weightKg,
    headCount,
    distanceKm,
    ratePerDeckPerKm,
    calvesAtFoot,
  });

  const gst = estimate.totalCost * 0.1;
  const lines = ["FREIGHT CALCULATION RESULT:"];
  lines.push(`Head: ${estimate.headCount}`);
  lines.push(`Weight: ${Math.round(estimate.averageWeightKg)}kg avg`);
  lines.push(`Category: ${estimate.freightCategory.displayName}`);
  lines.push(`Loading: ${estimate.headsPerDeck} head/deck`);
  lines.push(`Decks: ${estimate.decksRequired}`);
  lines.push(`Distance: ${Math.round(distanceKm)}km`);
  lines.push(`Rate: $${estimate.ratePerDeckPerKm.toFixed(2)}/deck/km`);
  lines.push(`Total: $${Math.round(estimate.totalCost).toLocaleString()} (+ $${Math.round(gst)} GST)`);
  lines.push(`Per head: $${estimate.costPerHead.toFixed(2)}`);
  lines.push(`Per deck: $${Math.round(estimate.costPerDeck).toLocaleString()}`);
  if (estimate.efficiencyPrompt) lines.push(`Freight Efficiency: ${estimate.efficiencyPrompt}`);
  if (estimate.categoryWarning) lines.push(`Category Escalation: ${estimate.categoryWarning}`);
  if (estimate.breederAutoDetectNotice) lines.push(`Breeder Loading: ${estimate.breederAutoDetectNotice}`);
  return lines.join("\n");
}

// MARK: - Yard Book Event Tools

function executeCreateYardBookEvent(input: Record<string, unknown>, store: ChatDataStore): string {
  const title = input.title as string;
  const date = input.date as string;
  const category = input.category as string;
  if (!title || !date || !category) return "Error: title, date, and category are required.";

  // Store the pending event for the caller to persist
  store.pendingYardBookEvents.push({
    title,
    date,
    category,
    is_all_day: (input.is_all_day as boolean) ?? true,
    notes: input.notes as string | undefined,
    is_recurring: (input.is_recurring as boolean) ?? false,
    recurrence_rule: input.recurrence_rule as string | undefined,
    linked_herd_names: input.linked_herd_names as string[] | undefined,
  });

  return `Created Yard Book event: "${title}" on ${date} (${category}).`;
}

function executeManageYardBookEvent(input: Record<string, unknown>, store: ChatDataStore): string {
  const action = input.action as string;
  const title = input.title as string;
  if (!action || !title) return "Error: action and title are required.";

  const match = store.yardBookItems.find(
    (i) => i.title.toLowerCase().includes(title.toLowerCase())
  );
  if (!match) return `No Yard Book event found matching '${title}'.`;

  store.pendingYardBookActions.push({ action, itemId: match.id, title: match.title });

  if (action === "complete") {
    return `Marked "${match.title}" as complete in Yard Book.`;
  } else {
    return `Deleted "${match.title}" from Yard Book.`;
  }
}

// MARK: - Price Scenario Tool

function executePriceScenario(input: Record<string, unknown>, store: ChatDataStore): string {
  const priceChange = input.price_change_per_kg as number;
  if (priceChange === undefined || priceChange === null) return "Error: Missing price_change_per_kg parameter.";
  if (priceChange === 0) return "Error: price_change_per_kg must be non-zero.";

  const herdName = input.herd_name as string | undefined;
  const activeHerds = store.herds.filter((h) => !h.is_sold);

  // Filter to specific herd if requested
  let targetHerds = activeHerds;
  if (herdName) {
    const match = findHerd(herdName, store.herds);
    if (!match) {
      const available = activeHerds.map((h) => h.name).join(", ");
      return `No herd found matching '${herdName}'. Available herds: ${available}`;
    }
    targetHerds = [match];
  }

  if (targetHerds.length === 0) return "No active herds in portfolio.";

  const changeDirection = priceChange > 0 ? "increase" : "decrease";
  const changeLabel = priceChange > 0 ? `+$${priceChange.toFixed(2)}` : `-$${Math.abs(priceChange).toFixed(2)}`;
  const lines = [`PRICE SCENARIO: ${changeLabel}/kg ${changeDirection}`];
  lines.push("");

  let totalCurrentValue = 0;
  let totalNewValue = 0;

  for (const herd of targetHerds) {
    // Get current valuation using the same engine as portfolio
    const currentResult = calculateHerdValuation(
      herd as Parameters<typeof calculateHerdValuation>[0],
      store.nationalPriceMap,
      store.premiumMap,
      undefined,
      store.saleyardPriceMap
    );

    const currentPricePerKg = currentResult.pricePerKg;
    const newPricePerKg = currentPricePerKg + priceChange;
    const projectedWeight = currentResult.projectedWeight;
    const headCount = herd.head_count ?? 0;

    // Calculate new value: head_count x projected_weight x new_price_per_kg
    // This is the physical value component with the adjusted price
    const currentPhysical = headCount * projectedWeight * currentPricePerKg;
    const newPhysical = headCount * projectedWeight * newPricePerKg;
    const difference = newPhysical - currentPhysical;

    totalCurrentValue += currentPhysical;
    totalNewValue += newPhysical;

    lines.push(`${herd.name}:`);
    lines.push(`  Head: ${headCount}, Weight: ${Math.round(projectedWeight)}kg`);
    lines.push(`  Current: $${currentPricePerKg.toFixed(2)}/kg = $${Math.round(currentPhysical).toLocaleString()}`);
    lines.push(`  Scenario: $${newPricePerKg.toFixed(2)}/kg = $${Math.round(newPhysical).toLocaleString()}`);
    lines.push(`  Difference: ${difference >= 0 ? "+" : ""}$${Math.round(difference).toLocaleString()}`);
    lines.push("");
  }

  // Portfolio total impact
  const totalDifference = totalNewValue - totalCurrentValue;
  lines.push("PORTFOLIO IMPACT:");
  lines.push(`Current total: $${Math.round(totalCurrentValue).toLocaleString()}`);
  lines.push(`Scenario total: $${Math.round(totalNewValue).toLocaleString()}`);
  lines.push(`Total ${changeDirection}: ${totalDifference >= 0 ? "+" : ""}$${Math.round(totalDifference).toLocaleString()}`);

  if (targetHerds.length > 1) {
    const pctChange = totalCurrentValue > 0 ? ((totalDifference / totalCurrentValue) * 100).toFixed(1) : "0.0";
    lines.push(`Percentage change: ${totalDifference >= 0 ? "+" : ""}${pctChange}%`);
  }

  return lines.join("\n");
}

// MARK: - Grid IQ Lookup Tool

function executeGridIQLookup(input: Record<string, unknown>, store: ChatDataStore): string {
  const queryType = input.query_type as string;
  if (!queryType) return "Error: Missing query_type parameter.";

  switch (queryType) {
    case "grid_iq_summary":
      return lookupGridIQSummary(store);
    case "analysis_details":
      return lookupAnalysisDetails(input.herd_name as string | undefined, input.processor_name as string | undefined, store);
    case "kill_history":
      return lookupKillHistory(input.herd_name as string | undefined, input.processor_name as string | undefined, store);
    case "grid_details":
      return lookupGridDetails(input.processor_name as string | undefined, store);
    case "compare_channels":
      return lookupChannelComparison(input.herd_name as string | undefined, store);
    default:
      return `Error: Unknown query_type '${queryType}'`;
  }
}

function lookupGridIQSummary(store: ChatDataStore): string {
  const lines = ["GRID IQ SUMMARY:"];
  lines.push(`Analyses: ${store.gridIQAnalyses.length}`);
  lines.push(`Kill sheets: ${store.killSheets.length}`);
  lines.push(`Processor grids: ${store.processorGrids.length}`);

  if (store.gridIQAnalyses.length === 0) {
    lines.push("\nNo Grid IQ analyses found. Upload a processor grid and run an analysis to get started.");
    return lines.join("\n");
  }

  // Debug: Show latest analyses
  const sorted = [...store.gridIQAnalyses].sort((a, b) => b.analysis_date.localeCompare(a.analysis_date));
  lines.push("\nLATEST ANALYSES:");
  for (const a of sorted.slice(0, 5)) {
    const date = new Date(a.analysis_date).toLocaleDateString("en-AU");
    const mode = a.analysis_mode === "postSale" ? "Post-Sale" : "Pre-Sale";
    let line = `- ${a.herd_name} x ${a.processor_name} (${date}, ${mode})`;
    line += `: Grid advantage $${Math.round(a.grid_iq_advantage).toLocaleString()}`;
    if (a.kill_score !== null) line += `, Kill Score: ${a.kill_score.toFixed(1)}`;
    if (a.gcr !== null) line += `, GCR: ${a.gcr.toFixed(1)}%`;
    lines.push(line);
  }

  // Debug: Show processor grid list
  if (store.processorGrids.length > 0) {
    lines.push("\nPROCESSOR GRIDS:");
    for (const g of store.processorGrids) {
      const date = new Date(g.grid_date).toLocaleDateString("en-AU");
      let line = `- ${g.processor_name} (${date})`;
      if (g.grid_code) line += ` [${g.grid_code}]`;
      if (g.expiry_date) {
        const expiry = new Date(g.expiry_date).toLocaleDateString("en-AU");
        line += `, expires ${expiry}`;
      }
      lines.push(line);
    }
  }

  return lines.join("\n");
}

function lookupAnalysisDetails(
  herdName: string | undefined,
  processorName: string | undefined,
  store: ChatDataStore
): string {
  let filtered = store.gridIQAnalyses;

  if (herdName) {
    const lowered = herdName.toLowerCase();
    filtered = filtered.filter((a) => a.herd_name.toLowerCase().includes(lowered));
  }
  if (processorName) {
    const lowered = processorName.toLowerCase();
    filtered = filtered.filter((a) => a.processor_name.toLowerCase().includes(lowered));
  }

  if (filtered.length === 0) {
    const hint = herdName || processorName ? ` matching '${herdName || processorName}'` : "";
    return `No Grid IQ analyses found${hint}. Available analyses: ${store.gridIQAnalyses.map((a) => `${a.herd_name} x ${a.processor_name}`).join(", ") || "none"}`;
  }

  // Debug: Show the most recent matching analysis in detail
  const sorted = [...filtered].sort((a, b) => b.analysis_date.localeCompare(a.analysis_date));
  const a = sorted[0];
  const date = new Date(a.analysis_date).toLocaleDateString("en-AU");
  const mode = a.analysis_mode === "postSale" ? "Post-Sale Audit" : "Pre-Sale Planning";

  const lines = [`GRID IQ ANALYSIS - ${a.herd_name} x ${a.processor_name}:`];
  lines.push(`Date: ${date}`);
  lines.push(`Mode: ${mode}`);
  lines.push(`Head count: ${a.head_count}`);
  lines.push(`Estimated carcase weight: ${a.estimated_carcase_weight.toFixed(1)}kg`);
  lines.push(`Dressing %: ${(a.dressing_percentage * 100).toFixed(1)}%`);
  lines.push(`Data: ${a.is_using_personalised_data ? "Personalised (kill history)" : "Industry baseline"}`);
  lines.push("");
  lines.push("VALUE COMPARISON:");
  lines.push(`MLA saleyard value: $${Math.round(a.mla_market_value).toLocaleString()}`);
  lines.push(`Headline grid value: $${Math.round(a.headline_grid_value).toLocaleString()}`);
  lines.push(`Realisation factor: ${(a.realisation_factor * 100).toFixed(1)}%`);
  lines.push(`Realistic grid outcome: $${Math.round(a.realistic_grid_outcome).toLocaleString()}`);
  lines.push(`Freight to saleyard: $${Math.round(a.freight_to_saleyard).toLocaleString()}`);
  lines.push(`Freight to processor: $${Math.round(a.freight_to_processor).toLocaleString()}`);
  lines.push(`Net saleyard: $${Math.round(a.net_saleyard_value).toLocaleString()}`);
  lines.push(`Net processor: $${Math.round(a.net_processor_value).toLocaleString()}`);
  lines.push(`Grid IQ advantage: $${Math.round(a.grid_iq_advantage).toLocaleString()}`);
  lines.push("");
  lines.push("SELL WINDOW:");
  lines.push(`Status: ${a.sell_window_status_raw}`);
  lines.push(`Detail: ${a.sell_window_detail}`);
  if (a.days_to_target !== null) lines.push(`Days to target: ${a.days_to_target}`);

  // Debug: Processor fit
  if (a.processor_fit_score !== null) {
    lines.push("");
    lines.push(`Processor fit: ${a.processor_fit_score.toFixed(0)}/100 (${a.processor_fit_label_raw ?? ""})`);
  }

  // Debug: Opportunity
  if (a.opportunity_value !== null) {
    lines.push("");
    lines.push("OPPORTUNITY:");
    lines.push(`Value: $${Math.round(a.opportunity_value).toLocaleString()}`);
    if (a.opportunity_driver) lines.push(`Driver: ${a.opportunity_driver}`);
  }

  // Debug: Post-sale scorecard metrics
  if (a.kill_score !== null || a.gcr !== null) {
    lines.push("");
    lines.push("SCORECARD:");
    if (a.kill_score !== null) {
      const label = a.kill_score >= 85 ? "Excellent" : a.kill_score >= 70 ? "Good" : a.kill_score >= 50 ? "Fair" : "Poor";
      lines.push(`Kill Score: ${a.kill_score.toFixed(1)}/100 (${label})`);
    }
    if (a.gcr !== null) lines.push(`GCR (Grid Capture Ratio): ${a.gcr.toFixed(1)}%`);
    if (a.grid_risk !== null) lines.push(`Grid Risk: ${a.grid_risk.toFixed(1)}%`);
    if (a.grid_compliance_score !== null) lines.push(`Grid compliance: ${a.grid_compliance_score.toFixed(1)}%`);
    if (a.fat_compliance_score !== null) lines.push(`Fat compliance: ${a.fat_compliance_score.toFixed(1)}%`);
    if (a.dentition_compliance_score !== null) lines.push(`Dentition compliance: ${a.dentition_compliance_score.toFixed(1)}%`);
  }

  // Debug: Show count if multiple analyses match
  if (sorted.length > 1) {
    lines.push(`\n(Showing most recent of ${sorted.length} matching analyses)`);
  }

  return lines.join("\n");
}

function lookupKillHistory(
  herdName: string | undefined,
  processorName: string | undefined,
  store: ChatDataStore
): string {
  if (store.killSheets.length === 0) return "No kill sheet records found. Upload a kill sheet via Grid IQ to get started.";

  let filtered = store.killSheets;
  if (processorName) {
    const lowered = processorName.toLowerCase();
    filtered = filtered.filter((k) => k.processor_name.toLowerCase().includes(lowered));
  }
  if (herdName) {
    // Debug: Filter by linked herd if available
    const herd = findHerd(herdName, store.herds);
    if (herd) {
      const herdFiltered = filtered.filter((k) => k.herd_id === herd.id);
      if (herdFiltered.length > 0) filtered = herdFiltered;
    }
  }

  const sorted = [...filtered].sort((a, b) => b.kill_date.localeCompare(a.kill_date));
  const lines = [`KILL SHEET HISTORY (${sorted.length} records):`];

  for (const k of sorted.slice(0, 10)) {
    const date = new Date(k.kill_date).toLocaleDateString("en-AU");
    lines.push("");
    lines.push(`- ${k.processor_name} (${date}):`);
    lines.push(`  Head: ${k.total_head_count}`);
    lines.push(`  Total body weight: ${k.total_body_weight.toFixed(1)}kg`);
    lines.push(`  Avg body weight: ${k.average_body_weight.toFixed(1)}kg`);
    lines.push(`  Gross value: $${Math.round(k.total_gross_value).toLocaleString()}`);
    lines.push(`  Avg $/kg: $${k.average_price_per_kg.toFixed(2)}`);
    lines.push(`  Avg $/head: $${Math.round(k.average_value_per_head).toLocaleString()}`);
    if (k.condemns > 0) lines.push(`  Condemns: ${k.condemns}`);
    if (k.realisation_factor !== null) lines.push(`  Realisation factor: ${(k.realisation_factor * 100).toFixed(1)}%`);
    if (k.property_name) lines.push(`  Property: ${k.property_name}`);
  }

  return lines.join("\n");
}

function lookupGridDetails(processorName: string | undefined, store: ChatDataStore): string {
  if (store.processorGrids.length === 0) return "No processor grids found. Upload a grid via Grid IQ to get started.";

  let filtered = store.processorGrids;
  if (processorName) {
    const lowered = processorName.toLowerCase();
    filtered = filtered.filter((g) => g.processor_name.toLowerCase().includes(lowered));
  }

  if (filtered.length === 0) {
    const available = store.processorGrids.map((g) => g.processor_name).join(", ");
    return `No grids found matching '${processorName}'. Available: ${available}`;
  }

  const lines = [`PROCESSOR GRIDS (${filtered.length}):`];
  for (const g of filtered) {
    const date = new Date(g.grid_date).toLocaleDateString("en-AU");
    lines.push("");
    lines.push(`- ${g.processor_name}:`);
    if (g.grid_code) lines.push(`  Grid code: ${g.grid_code}`);
    lines.push(`  Date: ${date}`);
    if (g.expiry_date) {
      const expiry = new Date(g.expiry_date);
      const isExpired = expiry < new Date();
      lines.push(`  Expiry: ${expiry.toLocaleDateString("en-AU")}${isExpired ? " (EXPIRED)" : ""}`);
    }
    if (g.location) lines.push(`  Location: ${g.location}`);

    // Debug: Show analyses using this grid
    const gridAnalyses = store.gridIQAnalyses.filter((a) => a.processor_grid_id === g.id);
    if (gridAnalyses.length > 0) {
      lines.push(`  Analyses using this grid: ${gridAnalyses.length}`);
    }
  }

  return lines.join("\n");
}

function lookupChannelComparison(herdName: string | undefined, store: ChatDataStore): string {
  if (store.gridIQAnalyses.length === 0) return "No Grid IQ analyses found. Run an analysis to compare saleyard vs processor channels.";

  let filtered = store.gridIQAnalyses;
  if (herdName) {
    const lowered = herdName.toLowerCase();
    filtered = filtered.filter((a) => a.herd_name.toLowerCase().includes(lowered));
  }

  if (filtered.length === 0) {
    return `No analyses found for '${herdName}'. Available: ${store.gridIQAnalyses.map((a) => a.herd_name).join(", ")}`;
  }

  // Debug: Group by herd, show latest analysis per processor
  const byHerd = new Map<string, typeof filtered>();
  for (const a of filtered) {
    const existing = byHerd.get(a.herd_name) ?? [];
    existing.push(a);
    byHerd.set(a.herd_name, existing);
  }

  const lines = ["CHANNEL COMPARISON (Saleyard vs Processor):"];

  for (const [name, analyses] of byHerd) {
    lines.push(`\n${name}:`);
    // Debug: Show latest analysis per processor
    const latestByProcessor = new Map<string, typeof analyses[0]>();
    for (const a of analyses) {
      const existing = latestByProcessor.get(a.processor_name);
      if (!existing || a.analysis_date > existing.analysis_date) {
        latestByProcessor.set(a.processor_name, a);
      }
    }

    for (const [proc, a] of latestByProcessor) {
      const advantage = a.grid_iq_advantage;
      const better = advantage > 0 ? "Processor" : "Saleyard";
      lines.push(`  ${proc}:`);
      lines.push(`    Net saleyard: $${Math.round(a.net_saleyard_value).toLocaleString()}`);
      lines.push(`    Net processor: $${Math.round(a.net_processor_value).toLocaleString()}`);
      lines.push(`    Advantage: $${Math.round(Math.abs(advantage)).toLocaleString()} to ${better}`);
      lines.push(`    Sell window: ${a.sell_window_status_raw}`);
    }
  }

  return lines.join("\n");
}

// MARK: - Auto-Generate Summary Cards from Tool Results
// Deterministic card extraction - does not depend on Haiku calling display_summary_cards

export function generateAutoCards(
  toolName: string,
  input: Record<string, unknown>,
  resultText: string,
  store?: ChatDataStore | null
): QuickInsight[] {
  const cards: QuickInsight[] = [];

  if (toolName === "lookup_portfolio_data") {
    const queryType = input.query_type as string;

    if (queryType === "portfolio_summary") {
      const valueMatch = resultText.match(/Total portfolio value: \$([\d,]+)/);
      const headMatch = resultText.match(/Total head: ([\d,]+)/);
      const herdsMatch = resultText.match(/Active herds: (\d+)/);
      if (valueMatch) {
        cards.push({ id: crypto.randomUUID(), label: "Portfolio Value", value: `$${valueMatch[1]}`, subtitle: herdsMatch ? `${herdsMatch[1]} herds` : undefined, sentiment: "neutral", action: { type: "portfolio" } });
      }
      if (headMatch) {
        cards.push({ id: crypto.randomUUID(), label: "Total Head", value: headMatch[1], subtitle: herdsMatch ? `across ${herdsMatch[1]} herds` : undefined, sentiment: "neutral", action: { type: "portfolio" } });
      }
    }

    if (queryType === "all_herds_summary") {
      const countMatch = resultText.match(/ALL ACTIVE HERDS \((\d+)\)/);
      const headMatches = [...resultText.matchAll(/: (\d+) head/g)];
      const totalHead = headMatches.reduce((sum, m) => sum + parseInt(m[1]), 0);
      if (countMatch && totalHead > 0) {
        cards.push({ id: crypto.randomUUID(), label: "Total Head", value: `${totalHead}`, subtitle: `${countMatch[1]} active herds`, sentiment: "neutral", action: { type: "portfolio" } });
      }
    }

    if (queryType === "herd_details") {
      const nameMatch = resultText.match(/HERD DETAILS - (.+?):/);
      const headMatch = resultText.match(/Head count: (\d+)/);
      const weightMatch = resultText.match(/Current weight: (\d+)kg/);
      const valueMatch = resultText.match(/Estimated value: \$([\d,]+)/);

      // Resolve herd ID from store for navigation
      const herdName = input.herd_name as string | undefined;
      let herdAction: QuickInsight["action"] = undefined;
      if (herdName && store?.herds) {
        const herd = store.herds.find((h) => h.name.toLowerCase() === herdName.toLowerCase());
        if (herd) herdAction = { type: "herdDetail", id: herd.id, name: herd.name };
      }

      if (valueMatch && nameMatch) {
        cards.push({ id: crypto.randomUUID(), label: nameMatch[1], value: `$${valueMatch[1]}`, subtitle: headMatch ? `${headMatch[1]} head` : undefined, sentiment: "neutral", action: herdAction });
      }
      if (headMatch && weightMatch) {
        cards.push({ id: crypto.randomUUID(), label: "Weight", value: `${weightMatch[1]}kg`, subtitle: `${headMatch[1]} head`, sentiment: "neutral", action: herdAction });
      }
    }

    if (queryType === "property_weather") {
      const tempMatch = resultText.match(/(\d+) degrees C \(feels like (\d+) degrees C\)/);
      const uvMatch = resultText.match(/UV Index: (\d+)/);
      const condMatch = resultText.match(/degrees C\), (.+)/);
      if (tempMatch) {
        const temp = parseInt(tempMatch[1]);
        cards.push({ id: crypto.randomUUID(), label: "Temperature", value: `${temp}°C`, subtitle: `Feels like ${tempMatch[2]}°C`, sentiment: temp >= 35 ? "negative" : "neutral" });
      }
      if (condMatch) {
        const humidMatch = resultText.match(/Humidity: (\d+)%/);
        cards.push({ id: crypto.randomUUID(), label: "Conditions", value: condMatch[1], subtitle: humidMatch ? `${humidMatch[1]}% humidity` : undefined, sentiment: "neutral" });
      }
      if (uvMatch) {
        const uv = parseInt(uvMatch[1]);
        const uvLabel = uv <= 2 ? "Low" : uv <= 5 ? "Moderate" : uv <= 7 ? "High" : uv <= 10 ? "Very High" : "Extreme";
        cards.push({ id: crypto.randomUUID(), label: "UV Index", value: `${uv}`, subtitle: uvLabel, sentiment: uv >= 8 ? "negative" : "neutral" });
      }
    }

    if (queryType === "market_prices") {
      const priceMatches = [...resultText.matchAll(/- (.+?)(?:\s*\([^)]+\))?:\s*AUD \$([\d.]+) per kg/g)];
      for (const m of priceMatches.slice(0, 2)) {
        cards.push({ id: crypto.randomUUID(), label: m[1], value: `$${m[2]}/kg`, subtitle: "MLA saleyard data", sentiment: "neutral", action: { type: "market" } });
      }
    }

    if (queryType === "yard_book") {
      const overdueMatch = resultText.match(/OVERDUE \((\d+)\)/);
      const upcomingMatch = resultText.match(/UPCOMING \((\d+)\)/);
      if (overdueMatch && parseInt(overdueMatch[1]) > 0) {
        cards.push({ id: crypto.randomUUID(), label: "Overdue", value: overdueMatch[1], subtitle: "Yard Book items", sentiment: "negative", action: { type: "yardBook" } });
      }
      if (upcomingMatch) {
        cards.push({ id: crypto.randomUUID(), label: "Upcoming", value: upcomingMatch[1], subtitle: "Yard Book items", sentiment: "neutral", action: { type: "yardBook" } });
      }
    }
  }

  if (toolName === "calculate_freight") {
    const totalMatch = resultText.match(/Total: \$([\d,]+) \(\+ \$([\d,]+) GST\)/);
    const perHeadMatch = resultText.match(/Per head: \$([\d.]+)/);
    const decksMatch = resultText.match(/Decks: (\d+)/);
    if (totalMatch) {
      cards.push({ id: crypto.randomUUID(), label: "Freight Cost", value: `$${totalMatch[1]}`, subtitle: `+ $${totalMatch[2]} GST`, sentiment: "neutral", action: { type: "freight" } });
    }
    if (perHeadMatch) {
      cards.push({ id: crypto.randomUUID(), label: "Per Head", value: `$${perHeadMatch[1]}`, subtitle: decksMatch ? `${decksMatch[1]} deck(s)` : undefined, sentiment: "neutral", action: { type: "freight" } });
    }
  }

  if (toolName === "calculate_price_scenario") {
    const totalMatch = resultText.match(/Total (?:increase|decrease): ([+-]?\$[\d,]+)/);
    const pctMatch = resultText.match(/Percentage change: ([+-]?[\d.]+)%/);
    const changeInput = input.price_change_per_kg as number;
    const sentiment = changeInput > 0 ? "positive" as const : "negative" as const;
    if (totalMatch) {
      cards.push({ id: crypto.randomUUID(), label: "Portfolio Impact", value: totalMatch[1], subtitle: pctMatch ? `${pctMatch[1]}% change` : undefined, sentiment, action: { type: "portfolio" } });
    }
    const scenarioMatch = resultText.match(/Scenario total: \$([\d,]+)/);
    if (scenarioMatch) {
      cards.push({ id: crypto.randomUUID(), label: "Scenario Value", value: `$${scenarioMatch[1]}`, subtitle: `at ${changeInput > 0 ? "+" : ""}$${changeInput.toFixed(2)}/kg`, sentiment: "neutral", action: { type: "portfolio" } });
    }
  }

  if (toolName === "lookup_grid_iq_data") {
    const advantageMatch = resultText.match(/Grid IQ advantage: \$([\d,]+)/);
    const killScoreMatch = resultText.match(/Kill Score: ([\d.]+)/);
    if (advantageMatch) {
      const val = parseInt(advantageMatch[1].replace(/,/g, ""));
      cards.push({ id: crypto.randomUUID(), label: "Grid Advantage", value: `$${advantageMatch[1]}`, sentiment: val > 0 ? "positive" : "neutral" });
    }
    if (killScoreMatch) {
      const score = parseFloat(killScoreMatch[1]);
      const label = score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Fair" : "Poor";
      cards.push({ id: crypto.randomUUID(), label: "Kill Score", value: killScoreMatch[1], subtitle: label, sentiment: score >= 70 ? "positive" : score >= 50 ? "neutral" : "negative" });
    }
  }

  return cards.slice(0, 4);
}

// MARK: - Helpers

// Debug: Fix for BRG-012 - when the query contains a breed name (e.g. "Brahman cross
// heifers"), the breed token must outweigh the sex/category token. Previously "heifer"
// matched Gelbvieh heifers before "Brahman" could promote the Brahman Breeder (Heifer)
// herd. Scoring: breed 10, name 5, sub-type 3, category 2, sex 1. Mirrors iOS findHerd.
function findHerd(
  name: string,
  herds: ChatDataStore["herds"]
): ChatDataStore["herds"][0] | undefined {
  const lowered = name.toLowerCase().trim();
  if (!lowered) return undefined;

  // Exact display-name match wins outright
  const exact = herds.find((h) => h.name.toLowerCase() === lowered);
  if (exact) return exact;

  // Whole-string contains match on display name (preserves old behaviour for queries
  // like "yearling steers" matching "Yearling Steers 1")
  const partial = herds.find(
    (h) => h.name.toLowerCase().includes(lowered) || lowered.includes(h.name.toLowerCase())
  );
  if (partial) return partial;

  // Token-weighted scoring. Letters-only split so punctuation doesn't create empty
  // tokens, then singularise per token for matching.
  const tokenize = (text: string): Set<string> =>
    new Set(
      text
        .toLowerCase()
        .split(/[^a-z]+/i)
        .filter((t) => t.length > 0)
    );

  const queryTokens = Array.from(tokenize(lowered));
  if (queryTokens.length === 0) return undefined;

  let bestMatch: ChatDataStore["herds"][0] | undefined;
  let bestScore = 0;

  for (const herd of herds) {
    if (herd.is_sold) continue;

    const nameTokens = tokenize(herd.name);
    const breedTokens = tokenize(herd.breed ?? "");
    const categoryTokens = tokenize(herd.category ?? "");
    const sexTokens = tokenize(herd.sex ?? "");
    const subTypeTokens = tokenize(herd.breeder_sub_type ?? "");

    let score = 0;
    for (const token of queryTokens) {
      const singular = token.length > 2 && token.endsWith("s") ? token.slice(0, -1) : token;
      const hit = (set: Set<string>) => set.has(token) || set.has(singular);
      if (hit(breedTokens)) score += 10;
      if (hit(nameTokens)) score += 5;
      if (hit(subTypeTokens)) score += 3;
      if (hit(categoryTokens)) score += 2;
      if (hit(sexTokens)) score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = herd;
    }
  }

  return bestScore > 0 ? bestMatch : undefined;
}

function resolveDistance(
  herd: ChatDataStore["herds"][0],
  properties: ChatDataStore["properties"]
): number | null {
  if (herd.property_id) {
    const prop = properties.find((p) => p.id === herd.property_id);
    if (prop?.default_saleyard_distance && prop.default_saleyard_distance > 0) {
      return prop.default_saleyard_distance;
    }
  }
  // Default property fallback
  const defaultProp = properties.find((p) => p.is_default);
  if (defaultProp?.default_saleyard_distance && defaultProp.default_saleyard_distance > 0) {
    return defaultProp.default_saleyard_distance;
  }
  return null;
}

// Fuzzy saleyard coordinate lookup matching iOS three-level resolution:
// 1. Exact match, 2. Case-insensitive match, 3. Contains match
function findSaleyardCoords(name: string): { lat: number; lon: number } | undefined {
  // Exact match
  if (saleyardCoordinates[name]) return saleyardCoordinates[name];

  const lower = name.toLowerCase();

  // Case-insensitive match
  const ciKey = Object.keys(saleyardCoordinates).find(
    (k) => k.toLowerCase() === lower
  );
  if (ciKey) return saleyardCoordinates[ciKey];

  // Contains match (e.g. "Charters Towers" matches "Charters Towers Dalrymple Saleyards")
  const containsKey = Object.keys(saleyardCoordinates).find(
    (k) => k.toLowerCase().includes(lower) || lower.includes(k.toLowerCase())
  );
  if (containsKey) return saleyardCoordinates[containsKey];

  return undefined;
}

async function resolveDistanceToSaleyard(
  herd: ChatDataStore["herds"][0],
  properties: ChatDataStore["properties"],
  saleyardName: string
): Promise<number> {
  // Try to calculate from property coords to saleyard coords via OSRM
  const prop = herd.property_id
    ? properties.find((p) => p.id === herd.property_id)
    : properties.find((p) => p.is_default);

  if (prop?.latitude && prop?.longitude) {
    const coords = findSaleyardCoords(saleyardName);
    if (coords) {
      const { distanceKm } = await getRoadDistanceKm(prop.latitude, prop.longitude, coords.lat, coords.lon);
      return distanceKm;
    }
  }

  // Fallback to default saleyard distance
  return prop?.default_saleyard_distance ?? 0;
}

async function resolveDistanceToSaleyardFromProps(
  properties: ChatDataStore["properties"],
  saleyardName: string
): Promise<number> {
  const prop = properties.find((p) => p.is_default) ?? properties[0];
  if (!prop) return 0;

  if (prop.latitude && prop.longitude) {
    const coords = findSaleyardCoords(saleyardName);
    if (coords) {
      const { distanceKm } = await getRoadDistanceKm(prop.latitude, prop.longitude, coords.lat, coords.lon);
      return distanceKm;
    }
  }
  return prop.default_saleyard_distance ?? 0;
}

// MARK: - Remember Fact Tool

async function executeRememberFact(input: Record<string, unknown>): Promise<string> {
  const fact = input.fact as string;
  const category = input.category as string;

  if (!fact || !category) return "Error: Missing fact or category parameter.";

  const validCategories = ["personal", "property", "livestock", "preference", "history", "general"];
  const safeCategory = validCategories.includes(category) ? category : "general";

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "Error: No authenticated user.";

    const { error } = await supabase
      .from("brangus_user_memories")
      .insert({ user_id: user.id, fact, category: safeCategory });

    if (error) return `Error saving memory: ${error.message}`;

    return "Memory saved. You'll remember this about them next time.";
  } catch (err) {
    return `Error saving memory: ${err}`;
  }
}

// MARK: - Search Past Chats Tool

async function executeSearchPastChats(input: Record<string, unknown>): Promise<string> {
  const query = input.query as string;
  const maxResults = (input.max_results as number) || 8;

  if (!query) return "Error: Missing or empty query parameter.";
  if (query.length > 200) return "Error: Query too long (max 200 characters).";

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "Error: No authenticated user.";

    const { data, error } = await supabase
      .rpc("search_past_chats", {
        search_query: query,
        max_results: Math.min(Math.max(maxResults, 1), 15),
      });

    if (error) return `Error searching past chats: ${error.message}`;
    if (!data || data.length === 0) {
      return "No matching conversations found. You haven't discussed this topic with them before.";
    }

    const lines: string[] = [];
    lines.push(`PAST CONVERSATION RESULTS (${data.length} matches for '${query}'):`);
    lines.push("");

    for (const result of data) {
      const title = result.conversation_title || "Untitled chat";
      const date = formatSearchDate(result.message_date || result.conversation_date);
      const role = result.message_role === "user" ? "Them" : "You (Brangus)";
      const content = result.message_content;

      lines.push(`[${date}] ${title}`);
      lines.push(`  ${role}: ${content}`);
      lines.push("");
    }

    lines.push("Reference these naturally like a mate recalling a past yarn. Don't list them back verbatim.");
    return lines.join("\n");
  } catch (err) {
    return `Error searching past chats: ${err}`;
  }
}

function formatSearchDate(isoString: string | null): string {
  if (!isoString) return "Unknown date";
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "Unknown date";
  }
}

// MARK: - Fetch User Memories (for system prompt injection)

export async function fetchUserMemories(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("brangus_user_memories")
      .select("fact, category")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0) return null;

    const lines = ["WHAT YOU KNOW ABOUT THIS PERSON (from previous conversations):"];
    for (const row of data) {
      lines.push(`- ${row.fact}`);
    }
    lines.push("");
    lines.push("Use these naturally in conversation. Don't list them back. Don't say \"I remember you told me...\". Just know them, like a mate would.");

    return lines.join("\n");
  } catch {
    return null;
  }
}
