// Brangus tool definitions and execution for web
// Mirrors iOS StockmanIQChatService+ToolUse.swift and +DataLookup.swift

import { calculateHerdValue, calculateProjectedWeight, type CategoryPriceEntry } from "../engines/valuation-engine";
import { calculateFreightEstimate } from "../engines/freight-engine";
import { mapCategoryToMLACategory, saleyardCoordinates } from "../data/reference-data";
import type { ChatDataStore } from "./types";

// MARK: - Tool Definitions (Anthropic tool_use format)

export const toolDefinitions = [
  {
    name: "lookup_portfolio_data",
    description:
      "Retrieves specific portfolio, market, and operational data from the app. This is your PRIMARY tool - call it for ANY question about herds, properties, prices, market indices, freight, sales, or the yard book. You MUST call this tool before citing any specific numbers (prices, weights, head counts, values, dates) in your response. Always look up data first. Never rely on the portfolio index alone.",
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
          description: "Specific property name for property_details",
        },
      },
      required: ["query_type"],
    },
  },
  {
    name: "calculate_freight",
    description:
      "Calculates exact freight costs using the app's Freight IQ engine. Use this EVERY TIME the user asks about freight costs, transport costs, or trucking costs. Either provide a herd_name to use an existing herd's details, or provide manual parameters.",
    input_schema: {
      type: "object",
      properties: {
        herd_name: {
          type: "string",
          description: "Name of an existing herd from the portfolio.",
        },
        head_count: { type: "integer", description: "Number of head to transport." },
        average_weight_kg: { type: "number", description: "Average weight per head in kg." },
        category: { type: "string", description: "Livestock category." },
        sex: { type: "string", enum: ["Male", "Female"], description: "Sex of the livestock." },
        destination_saleyard: { type: "string", description: "Destination saleyard name." },
        distance_km: { type: "number", description: "Manual distance in km." },
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
        date: { type: "string", description: "Event date in YYYY-MM-DD format." },
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
];

// MARK: - Tool Execution

export function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  store: ChatDataStore
): string {
  switch (toolName) {
    case "lookup_portfolio_data":
      return executeLookup(input, store);
    case "calculate_freight":
      return executeFreight(input, store);
    case "create_yard_book_event":
      return executeCreateYardBookEvent(input, store);
    case "manage_yard_book_event":
      return executeManageYardBookEvent(input, store);
    default:
      return `Error: Unknown tool '${toolName}'`;
  }
}

// MARK: - Lookup Tool

function executeLookup(input: Record<string, unknown>, store: ChatDataStore): string {
  const queryType = input.query_type as string;
  if (!queryType) return "Error: Missing query_type parameter.";

  switch (queryType) {
    case "portfolio_summary":
      return lookupPortfolioSummary(store);
    case "herd_details":
      return lookupHerdDetails(input.herd_name as string, store);
    case "all_herds_summary":
      return lookupAllHerdsSummary(store);
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
    default:
      return `Error: Unknown query_type '${queryType}'`;
  }
}

// MARK: - Portfolio Summary

function lookupPortfolioSummary(store: ChatDataStore): string {
  const activeHerds = store.herds.filter((h) => !h.is_sold);
  const totalHead = activeHerds.reduce((sum, h) => sum + (h.head_count ?? 0), 0);

  const lines = ["PORTFOLIO SUMMARY:"];
  lines.push(`Total portfolio value: $${Math.round(store.portfolioValue).toLocaleString()}`);
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

function lookupHerdDetails(name: string | undefined, store: ChatDataStore): string {
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
  lines.push(`Current weight: ${Math.round(herd.current_weight)}kg`);

  if (herd.daily_weight_gain > 0) {
    lines.push(`Daily weight gain: ${herd.daily_weight_gain.toFixed(2)}kg/day`);

    // Calculate projected weight
    const created = new Date(herd.created_at);
    const now = new Date();
    const projected = calculateProjectedWeight(
      herd.initial_weight,
      created,
      herd.dwg_change_date ? new Date(herd.dwg_change_date) : null,
      now,
      herd.previous_dwg ?? null,
      herd.daily_weight_gain
    );
    lines.push(`Projected weight: ${Math.round(projected)}kg`);
  }

  if (herd.selected_saleyard) lines.push(`Saleyard: ${herd.selected_saleyard}`);

  if (herd.is_breeder) {
    const calvingPct = (herd.calving_rate > 1 ? herd.calving_rate : herd.calving_rate * 100);
    lines.push(`Breeder: Yes (calving rate: ${Math.round(calvingPct)}%)`);
    if (herd.is_pregnant) lines.push("Pregnant: Yes");
    if (herd.joined_date) lines.push(`Joined date: ${herd.joined_date}`);
  }

  // Property
  if (herd.property_id) {
    const prop = store.properties.find((p) => p.id === herd.property_id);
    if (prop) lines.push(`Property: ${prop.property_name}`);
  }
  if (herd.paddock_name) lines.push(`Paddock: ${herd.paddock_name}`);
  if (herd.notes) lines.push(`Notes: ${herd.notes}`);
  lines.push(`Added: ${new Date(herd.created_at).toLocaleDateString("en-AU")}`);

  // Calculate value for this herd
  const value = calculateHerdValue(
    herd as Parameters<typeof calculateHerdValue>[0],
    store.nationalPriceMap,
    store.premiumMap,
    undefined,
    store.saleyardPriceMap
  );
  if (value > 0) {
    lines.push(`Estimated value: $${Math.round(value).toLocaleString()}`);
    if (herd.head_count > 0) {
      lines.push(`Value per head: $${Math.round(value / herd.head_count).toLocaleString()}`);
    }
  }

  return lines.join("\n");
}

// MARK: - All Herds Summary

function lookupAllHerdsSummary(store: ChatDataStore): string {
  const activeHerds = store.herds.filter((h) => !h.is_sold);
  if (activeHerds.length === 0) return "No active herds in portfolio.";

  const lines = [`ALL ACTIVE HERDS (${activeHerds.length}):`];
  for (const herd of activeHerds) {
    let line = `- ${herd.name}: ${herd.head_count} head`;
    line += `, ${herd.species} ${herd.breed}, ${herd.category}`;
    line += `, ${herd.sex}, ${herd.age_months} months`;
    line += `, ${Math.round(herd.current_weight)}kg`;
    if (herd.daily_weight_gain > 0) line += `, DWG ${herd.daily_weight_gain.toFixed(2)}kg/day`;
    if (herd.selected_saleyard) line += `, saleyard: ${herd.selected_saleyard}`;
    if (herd.is_breeder) line += ", breeder";
    lines.push(line);
  }
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

  // Category prices
  if (store.categoryPricesRaw.length > 0) {
    let filtered = store.categoryPricesRaw;
    if (category) {
      const mlaCat = mapCategoryToMLACategory(category);
      filtered = store.categoryPricesRaw.filter(
        (p) =>
          p.category.toLowerCase().includes(category.toLowerCase()) ||
          category.toLowerCase().includes(p.category.toLowerCase()) ||
          p.category.toLowerCase().includes(mlaCat.toLowerCase()) ||
          mlaCat.toLowerCase().includes(p.category.toLowerCase())
      );
    }

    if (filtered.length > 0) {
      lines.push("CATEGORY PRICES:");
      // Group by category
      const grouped = new Map<string, { price: number; range: string | null }[]>();
      for (const p of filtered) {
        const entries = grouped.get(p.category) ?? [];
        entries.push({ price: p.price_per_kg, range: p.weight_range });
        grouped.set(p.category, entries);
      }
      for (const [cat, entries] of grouped) {
        for (const e of entries) {
          const rangeLabel = e.range ? ` (${e.range}kg)` : "";
          lines.push(`- ${cat}${rangeLabel}: $${e.price.toFixed(2)}/kg`);
        }
      }
    } else {
      lines.push(`No price data found for '${category}'.`);
    }
  } else {
    lines.push("CATEGORY PRICES: Market data unavailable.");
  }

  return lines.join("\n");
}

// MARK: - Seasonal Pricing (simplified - returns current prices as proxy)

function lookupSeasonalPricing(category: string | undefined, store: ChatDataStore): string {
  // Web app doesn't have seasonal data loaded yet - return current prices as guidance
  return lookupMarketPrices(category, store) +
    "\n\nNote: Seasonal historical data is not yet available on the web version. These are current market prices.";
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

    const estimate = calculateFreightEstimate({
      appCategory: herd.category,
      sex: herd.sex,
      averageWeightKg: herd.current_weight || herd.initial_weight,
      headCount: herd.head_count,
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
    const est = calculateFreightEstimate({
      appCategory: herd.category,
      sex: herd.sex,
      averageWeightKg: herd.current_weight || herd.initial_weight,
      headCount: herd.head_count,
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

  const now = new Date();
  const overdue = store.yardBookItems.filter(
    (i) => !i.is_completed && new Date(i.date) < now
  );
  const upcoming = store.yardBookItems.filter(
    (i) => !i.is_completed && new Date(i.date) >= now
  );
  const completed = store.yardBookItems.filter((i) => i.is_completed);

  const lines = ["YARD BOOK:"];

  if (overdue.length > 0) {
    lines.push(`\nOVERDUE (${overdue.length}):`);
    for (const item of overdue) {
      lines.push(`- ${item.title} (${item.date}, ${item.category})`);
    }
  }
  if (upcoming.length > 0) {
    lines.push(`\nUPCOMING (${upcoming.length}):`);
    for (const item of upcoming.slice(0, 10)) {
      lines.push(`- ${item.title} (${item.date}, ${item.category})`);
    }
  }
  if (completed.length > 0) {
    lines.push(`\nRECENTLY COMPLETED (${Math.min(completed.length, 5)}):`);
    for (const item of completed.slice(0, 5)) {
      lines.push(`- ${item.title} (${item.date}, ${item.category})`);
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

  const herdMusters = store.musterRecords.filter((r) => r.herd_group_id === herd.id);
  const herdHealth = store.healthRecords.filter((r) => r.herd_group_id === herd.id);

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

// MARK: - Calculate Freight Tool

function executeFreight(input: Record<string, unknown>, store: ChatDataStore): string {
  let headCount: number;
  let weightKg: number;
  let category: string;
  let sex: string;
  let distanceKm: number;

  const herdName = input.herd_name as string | undefined;
  if (herdName) {
    const herd = findHerd(herdName, store.herds);
    if (!herd) return `No herd found matching '${herdName}'.`;
    headCount = herd.head_count;
    weightKg = herd.current_weight || herd.initial_weight;
    category = herd.category;
    sex = herd.sex;

    // Resolve distance
    const destSaleyard = input.destination_saleyard as string | undefined;
    const manualDist = input.distance_km as number | undefined;
    if (manualDist && manualDist > 0) {
      distanceKm = manualDist;
    } else if (destSaleyard) {
      distanceKm = resolveDistanceToSaleyard(herd, store.properties, destSaleyard);
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
    if (manualDist && manualDist > 0) {
      distanceKm = manualDist;
    } else if (destSaleyard) {
      // Use first property coords or fallback
      distanceKm = resolveDistanceToSaleyardFromProps(store.properties, destSaleyard);
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
  });

  const gst = estimate.totalCost * 0.1;
  const lines = ["FREIGHT CALCULATION RESULT:"];
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

// MARK: - Helpers

function findHerd(
  name: string,
  herds: ChatDataStore["herds"]
): ChatDataStore["herds"][0] | undefined {
  const lowered = name.toLowerCase();

  // Exact match
  const exact = herds.find((h) => h.name.toLowerCase() === lowered);
  if (exact) return exact;

  // Contains match
  const partial = herds.find(
    (h) => h.name.toLowerCase().includes(lowered) || lowered.includes(h.name.toLowerCase())
  );
  if (partial) return partial;

  // Singular/plural match
  const singularQuery = lowered.endsWith("s") ? lowered.slice(0, -1) : lowered;
  const singular = herds.find((h) => {
    const herdLower = h.name.toLowerCase();
    const singularHerd = herdLower.endsWith("s") ? herdLower.slice(0, -1) : herdLower;
    return herdLower.includes(singularQuery) || singularHerd.includes(singularQuery);
  });
  if (singular) return singular;

  // Category/sex match
  const byCat = herds.find(
    (h) =>
      !h.is_sold &&
      (h.category.toLowerCase().includes(singularQuery) || h.sex.toLowerCase().includes(singularQuery))
  );
  if (byCat) return byCat;

  // Word overlap
  const queryWords = new Set(lowered.split(" "));
  let bestMatch: ChatDataStore["herds"][0] | undefined;
  let bestOverlap = 0;
  for (const herd of herds) {
    const herdWords = new Set(herd.name.toLowerCase().split(" "));
    const overlap = [...queryWords].filter((w) => herdWords.has(w)).length;
    if (overlap > bestOverlap && overlap >= 1) {
      bestOverlap = overlap;
      bestMatch = herd;
    }
  }
  return bestMatch;
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

function resolveDistanceToSaleyard(
  herd: ChatDataStore["herds"][0],
  properties: ChatDataStore["properties"],
  saleyardName: string
): number {
  // Try to calculate from property coords to saleyard coords
  const prop = herd.property_id
    ? properties.find((p) => p.id === herd.property_id)
    : properties.find((p) => p.is_default);

  if (prop?.latitude && prop?.longitude) {
    const coords = saleyardCoordinates[saleyardName];
    if (coords) {
      return haversineKm(prop.latitude, prop.longitude, coords.lat, coords.lon);
    }
  }

  // Fallback to default saleyard distance
  return prop?.default_saleyard_distance ?? 0;
}

function resolveDistanceToSaleyardFromProps(
  properties: ChatDataStore["properties"],
  saleyardName: string
): number {
  const prop = properties.find((p) => p.is_default) ?? properties[0];
  if (!prop) return 0;

  if (prop.latitude && prop.longitude) {
    const coords = saleyardCoordinates[saleyardName];
    if (coords) {
      return haversineKm(prop.latitude, prop.longitude, coords.lat, coords.lon);
    }
  }
  return prop.default_saleyard_distance ?? 0;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
