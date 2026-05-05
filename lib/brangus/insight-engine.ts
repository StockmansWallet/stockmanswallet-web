// Brangus Insight Engine - server-side evaluation.
// Computes real insights from portfolio data for the insights hub page.
// Runs as a server component data loader (no client JS).

import { createClient } from "@/lib/supabase/server";
import { getEffectiveJoinedDate } from "@/lib/data/breeding";
import {
  calculateHerdValuation,
  calculateProjectedWeight,
  categoryFallback,
  daysBetween,
  defaultFallbackPrice,
  type CategoryPriceEntry,
  type HerdForValuation,
} from "@/lib/engines/valuation-engine";
import { centsToDollars } from "@/lib/types/money";
import { resolveMLACategory } from "@/lib/data/weight-mapping";
import { cattleBreedPremiums, resolveMLASaleyardName } from "@/lib/data/reference-data";
import { expandWithNearbySaleyards } from "@/lib/data/saleyard-proximity";

// MARK: - Types

export interface BrangusInsight {
  id: string;
  templateId: string;
  title: string;
  keyFigure: string;
  keyFigureSubtitle: string;
  narrative: string;
  sentiment: "positive" | "negative" | "neutral";
  icon: string;
  herdName?: string;
  linkHref?: string;
  priority: number;
}

interface HerdRow {
  id: string;
  name: string;
  species: string;
  breed: string;
  category: string;
  head_count: number;
  initial_weight: number;
  current_weight: number;
  daily_weight_gain: number;
  dwg_change_date: string | null;
  previous_dwg: number | null;
  created_at: string;
  updated_at: string;
  is_breeder: boolean;
  is_pregnant: boolean;
  joined_date: string | null;
  calving_rate: number;
  breeding_program_type: string | null;
  joining_period_start: string | null;
  joining_period_end: string | null;
  selected_saleyard: string | null;
  breed_premium_override: number | null;
  mortality_rate: number | null;
  additional_info: string | null;
  calf_weight_recorded_date: string | null;
  breeder_sub_type: string | null;
}

interface YardbookRow {
  id: string;
  title: string;
  event_date: string;
  is_completed: boolean;
  category_raw: string;
}

// Seasonal monthly averages per MLA category
interface SeasonalEntry {
  category: string;
  monthlyAvg: Record<number, number>;
  bestMonth: number | null;
}

// MARK: - Currency Formatter

function formatAUD(value: number): string {
  return "$" + Math.round(value).toLocaleString("en-AU");
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// MARK: - Main Evaluation

export async function evaluateInsights(): Promise<BrangusInsight[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Parallel data fetch
  const [{ data: herds }, { data: breedPremiumData }, { data: yardbookItems }] = await Promise.all([
    supabase
      .from("herds")
      .select(`id, name, species, breed, category, head_count,
               initial_weight, current_weight, daily_weight_gain,
               dwg_change_date, previous_dwg, created_at,
               is_breeder, is_pregnant, joined_date, calving_rate,
               breeding_program_type, joining_period_start, joining_period_end,
               breed_premium_override, mortality_rate, selected_saleyard,
               additional_info, calf_weight_recorded_date, updated_at,
               breeder_sub_type`)
      .eq("user_id", user.id)
      .eq("is_sold", false)
      .eq("is_deleted", false)
      .order("name"),
    supabase.from("breed_premiums").select("breed, premium_percent:premium_pct"),
    supabase
      .from("yard_book_items")
      .select("id, title, event_date, is_completed, category_raw")
      .eq("user_id", user.id)
      .eq("is_deleted", false),
  ]);

  const activeHerds = (herds ?? []) as HerdRow[];
  if (activeHerds.length === 0) return [];

  // Fetch prices using RPC (matches dashboard - avoids 50k row truncation and includes nearby saleyards)
  const herdSaleyards = [...new Set(activeHerds.map((h) => h.selected_saleyard ? resolveMLASaleyardName(h.selected_saleyard) : null).filter(Boolean))] as string[];
  const saleyards = expandWithNearbySaleyards(herdSaleyards);
  const primaryCategories = [...new Set(activeHerds.map((h) => resolveMLACategory(h.category, h.initial_weight, h.breeder_sub_type ?? undefined).primaryMLACategory))];
  const mlaCategories = [...new Set([...primaryCategories, ...primaryCategories.map(c => categoryFallback(c)).filter((c): c is string => c !== null)])];

  type PriceRow = { category: string; price_per_kg: number; weight_range: string | null; saleyard: string; breed: string | null; data_date: string };
  const emptyPrices: PriceRow[] = [];

  const { data: allPrices } = mlaCategories.length > 0
    ? await supabase.rpc("latest_saleyard_prices", {
        p_saleyards: saleyards,
        p_categories: mlaCategories,
      }) as unknown as { data: PriceRow[] | null }
    : { data: emptyPrices };

  // Build price maps
  const nationalPriceMap = new Map<string, CategoryPriceEntry[]>();
  const saleyardPriceMap = new Map<string, CategoryPriceEntry[]>();
  const saleyardBreedPriceMap = new Map<string, CategoryPriceEntry[]>();
  for (const p of (allPrices ?? [])) {
    const priceEntry = { price_per_kg: centsToDollars(p.price_per_kg), weight_range: p.weight_range, data_date: p.data_date };
    if (p.saleyard === "National" && p.breed === null) {
      const entries = nationalPriceMap.get(p.category) ?? [];
      entries.push(priceEntry);
      nationalPriceMap.set(p.category, entries);
    } else if (p.saleyard !== "National") {
      if (p.breed === null) {
        const key = `${p.category}|${p.saleyard}`;
        const entries = saleyardPriceMap.get(key) ?? [];
        entries.push(priceEntry);
        saleyardPriceMap.set(key, entries);
      } else {
        const key = `${p.category}|${p.breed}|${p.saleyard}`;
        const entries = saleyardBreedPriceMap.get(key) ?? [];
        entries.push(priceEntry);
        saleyardBreedPriceMap.set(key, entries);
      }
    }
  }

  const premiumMap = new Map<string, number>(Object.entries(cattleBreedPremiums));
  for (const b of (breedPremiumData ?? [])) {
    premiumMap.set(b.breed, b.premium_percent);
  }

  // Fetch seasonal data
  const seasonalData = await fetchSeasonalData(mlaCategories, supabase);

  // Compute valuations
  const valuations = activeHerds.map((h) => ({
    herd: h,
    result: calculateHerdValuation(
      h as unknown as HerdForValuation,
      nationalPriceMap, premiumMap, undefined, saleyardPriceMap, saleyardBreedPriceMap
    ),
  }));

  // Evaluate all templates
  const insights: BrangusInsight[] = [];

  insights.push(...evaluatePortfolio(valuations));
  insights.push(...evaluateSellVsHold(valuations, nationalPriceMap, premiumMap, saleyardPriceMap, saleyardBreedPriceMap));
  insights.push(...evaluateBestMonth(valuations, seasonalData));
  insights.push(...evaluateBreeding(valuations));
  insights.push(...evaluateYardbook((yardbookItems ?? []) as YardbookRow[]));

  // Sort by priority DESC, take top 6
  insights.sort((a, b) => b.priority - a.priority);
  return insights.slice(0, 6);
}

// MARK: - Portfolio Snapshot

function evaluatePortfolio(
  valuations: { herd: HerdRow; result: { netValue: number } }[]
): BrangusInsight[] {
  const totalValue = valuations.reduce((sum, v) => sum + v.result.netValue, 0);
  const totalHead = valuations.reduce((sum, v) => sum + v.herd.head_count, 0);
  const herdCount = valuations.length;

  return [{
    id: "portfolio-snapshot",
    templateId: "portfolio",
    title: "Portfolio Value",
    keyFigure: formatAUD(totalValue),
    keyFigureSubtitle: `${totalHead} head across ${herdCount} herd${herdCount !== 1 ? "s" : ""}`,
    narrative: `Your portfolio is valued at ${formatAUD(totalValue)} based on current market prices. ${herdCount > 1 ? `Spread across ${herdCount} herds.` : ""}`,
    sentiment: "neutral",
    icon: "wallet",
    linkHref: "/dashboard",
    priority: 90,
  }];
}

// MARK: - Sell vs Hold

function evaluateSellVsHold(
  valuations: { herd: HerdRow; result: { netValue: number; pricePerKg: number; projectedWeight: number } }[],
  nationalPriceMap: Map<string, CategoryPriceEntry[]>,
  premiumMap: Map<string, number>,
  saleyardPriceMap: Map<string, CategoryPriceEntry[]>,
  saleyardBreedPriceMap: Map<string, CategoryPriceEntry[]>,
): BrangusInsight[] {
  const insights: BrangusInsight[] = [];
  const now = new Date();

  // Only herds with meaningful DWG
  const candidates = valuations
    .filter((v) => v.herd.daily_weight_gain > 0 && !v.herd.is_breeder)
    .sort((a, b) => b.result.netValue - a.result.netValue)
    .slice(0, 3);

  for (const { herd, result } of candidates) {
    const currentValue = result.netValue;
    let bestGain = 0;
    let bestDays = 0;
    let bestValue = currentValue;

    for (const days of [30, 60, 90]) {
      const futureDate = new Date(now.getTime() + days * 86400000);
      const futureWeight = calculateProjectedWeight(
        herd.initial_weight,
        new Date(herd.created_at),
        herd.dwg_change_date ? new Date(herd.dwg_change_date) : null,
        futureDate,
        herd.previous_dwg,
        herd.daily_weight_gain
      );

      // Revalue with projected weight
      const futureHerd = { ...herd, current_weight: futureWeight };
      const futureResult = calculateHerdValuation(
        futureHerd as unknown as HerdForValuation,
        nationalPriceMap, premiumMap, futureDate, saleyardPriceMap, saleyardBreedPriceMap
      );

      const gain = futureResult.netValue - currentValue;
      if (gain > bestGain) {
        bestGain = gain;
        bestDays = days;
        bestValue = futureResult.netValue;
      }
    }

    if (bestGain >= 500) {
      insights.push({
        id: `sell-hold-${herd.id}`,
        templateId: "sellVsHold",
        title: "Sell vs Hold",
        keyFigure: `+${formatAUD(bestGain)}`,
        keyFigureSubtitle: `in ${bestDays} days if held`,
        narrative: `Holding your ${herd.name} for ${bestDays} days could add ${formatAUD(bestGain)} in value, reaching ${formatAUD(bestValue)} as they gain weight.`,
        sentiment: "positive",
        icon: "scale",
        herdName: herd.name,
        linkHref: `/dashboard/herds/${herd.id}`,
        priority: 70 + Math.min(15, bestGain / 1000),
      });
    }
  }

  return insights;
}

// MARK: - Best Sale Month

function evaluateBestMonth(
  valuations: { herd: HerdRow; result: { netValue: number; pricePerKg: number } }[],
  seasonalData: SeasonalEntry[],
): BrangusInsight[] {
  const insights: BrangusInsight[] = [];
  const now = new Date();
  const currentMonth = now.getMonth() + 1;

  // Build seasonal lookup by MLA category
  const seasonalMap = new Map<string, SeasonalEntry>();
  for (const s of seasonalData) seasonalMap.set(s.category, s);

  const candidates = valuations
    .filter((v) => v.herd.daily_weight_gain > 0 && !v.herd.is_breeder)
    .sort((a, b) => b.result.netValue - a.result.netValue)
    .slice(0, 2);

  for (const { herd, result } of candidates) {
    const mlaCategory = resolveMLACategory(herd.category, herd.initial_weight, herd.breeder_sub_type ?? undefined).primaryMLACategory;
    const seasonal = seasonalMap.get(mlaCategory);
    if (!seasonal || !seasonal.bestMonth) continue;

    // Project weight at best month
    const monthsAhead = ((seasonal.bestMonth - currentMonth + 12) % 12) || 12;
    const daysAhead = monthsAhead * 30;
    const futureDate = new Date(now.getTime() + daysAhead * 86400000);
    const futureWeight = calculateProjectedWeight(
      herd.initial_weight,
      new Date(herd.created_at),
      herd.dwg_change_date ? new Date(herd.dwg_change_date) : null,
      futureDate,
      herd.previous_dwg,
      herd.daily_weight_gain
    );

    const bestMonthPrice = seasonal.monthlyAvg[seasonal.bestMonth] ?? result.pricePerKg;
    const bestMonthValue = herd.head_count * futureWeight * bestMonthPrice;
    const upside = bestMonthValue - result.netValue;

    if (upside >= 500 && seasonal.bestMonth !== currentMonth) {
      const monthName = MONTH_NAMES[seasonal.bestMonth - 1];
      insights.push({
        id: `best-month-${herd.id}`,
        templateId: "bestMonth",
        title: "Best Sale Month",
        keyFigure: monthName,
        keyFigureSubtitle: `${formatAUD(bestMonthValue)} projected value`,
        narrative: `Historical pricing suggests ${monthName} is the strongest month for ${mlaCategory}. At projected weight of ${Math.round(futureWeight)}kg, your ${herd.name} could be worth ${formatAUD(bestMonthValue)}.`,
        sentiment: "positive",
        icon: "calendar",
        herdName: herd.name,
        linkHref: `/dashboard/herds/${herd.id}`,
        priority: 60 + Math.min(15, upside / 2000),
      });
    }
  }

  return insights;
}

// MARK: - Breeding Pipeline

function evaluateBreeding(
  valuations: { herd: HerdRow; result: { netValue: number; pricePerKg: number } }[]
): BrangusInsight[] {
  const insights: BrangusInsight[] = [];
  const now = new Date();
  const BREEDING_CYCLE_DAYS = 365;

  const pregnantHerds = valuations.filter((v) => v.herd.is_pregnant && getEffectiveJoinedDate(v.herd) !== null);

  for (const { herd, result } of pregnantHerds.slice(0, 2)) {
    const joinedDate = getEffectiveJoinedDate(herd)!;
    const daysSinceJoining = daysBetween(joinedDate, now);
    const progress = Math.min(100, Math.round((daysSinceJoining / BREEDING_CYCLE_DAYS) * 100));
    const daysRemaining = Math.max(0, BREEDING_CYCLE_DAYS - daysSinceJoining);
    const expectedCalvingDate = new Date(joinedDate.getTime() + BREEDING_CYCLE_DAYS * 86400000);

    const calvingRate = herd.calving_rate > 0 ? herd.calving_rate : 0.85;
    const expectedCalves = Math.round(herd.head_count * calvingRate);

    // Estimate calf value at weaning (~200kg for cattle)
    const weaningWeight = herd.species === "Cattle" ? 200 : 30;
    const calfValue = expectedCalves * weaningWeight * result.pricePerKg;

    if (expectedCalves > 0) {
      const calvingMonth = MONTH_NAMES[expectedCalvingDate.getMonth()];
      insights.push({
        id: `breeding-${herd.id}`,
        templateId: "breeding",
        title: "Calving Forecast",
        keyFigure: `${expectedCalves} calves`,
        keyFigureSubtitle: `expected ${calvingMonth}, ${formatAUD(calfValue)} projected value`,
        narrative: `Your ${herd.name} (${herd.head_count} head) is ${progress}% through gestation with ${daysRemaining} days to go. At ${Math.round(calvingRate * 100)}% calving rate, expect ~${expectedCalves} calves.`,
        sentiment: "positive",
        icon: "heart-pulse",
        herdName: herd.name,
        linkHref: `/dashboard/herds/${herd.id}`,
        priority: 65,
      });
    }
  }

  return insights;
}

// MARK: - Yardbook Alerts

function evaluateYardbook(items: YardbookRow[]): BrangusInsight[] {
  const insights: BrangusInsight[] = [];
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const week = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  const weekFromNow = `${week.getFullYear()}-${String(week.getMonth() + 1).padStart(2, "0")}-${String(week.getDate()).padStart(2, "0")}`;

  const overdue = items.filter((i) => !i.is_completed && i.event_date < todayStr);
  const upcoming = items.filter((i) => !i.is_completed && i.event_date >= todayStr && i.event_date <= weekFromNow);

  if (overdue.length > 0) {
    insights.push({
      id: "yardbook-overdue",
      templateId: "yardbook",
      title: "Overdue Tasks",
      keyFigure: `${overdue.length}`,
      keyFigureSubtitle: `overdue task${overdue.length !== 1 ? "s" : ""} in Yardbook`,
      narrative: overdue.length === 1
        ? `"${overdue[0].title}" is past due. Tap to review your Yardbook.`
        : `You have ${overdue.length} overdue tasks including "${overdue[0].title}". Time to catch up.`,
      sentiment: "negative",
      icon: "alert-triangle",
      linkHref: "/dashboard/tools/yardbook",
      priority: 80,
    });
  }

  if (upcoming.length > 0) {
    insights.push({
      id: "yardbook-upcoming",
      templateId: "yardbook",
      title: "Coming Up",
      keyFigure: `${upcoming.length}`,
      keyFigureSubtitle: `task${upcoming.length !== 1 ? "s" : ""} this week`,
      narrative: upcoming.length === 1
        ? `"${upcoming[0].title}" is coming up. Stay on top of your run sheet.`
        : `${upcoming.length} tasks this week including "${upcoming[0].title}".`,
      sentiment: "neutral",
      icon: "clipboard-list",
      linkHref: "/dashboard/tools/yardbook",
      priority: 55,
    });
  }

  return insights;
}

// MARK: - Seasonal Data Fetching

const SEASONAL_MULTIPLIERS: Record<number, number> = {
  1: 1.02, 2: 1.05, 3: 1.08, 4: 1.06, 5: 1.03, 6: 0.97,
  7: 0.93, 8: 0.95, 9: 0.98, 10: 1.01, 11: 1.00, 12: 1.01,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchSeasonalData(mlaCategories: string[], supabase: any): Promise<SeasonalEntry[]> {
  if (mlaCategories.length === 0) return [];

  try {
    const { data: rows, error } = await supabase
      .from("historical_market_prices")
      .select("category, price_per_kg, price_date")
      .in("category", mlaCategories);

    if (!error && rows && rows.length > 0) {
      const catMap = new Map<string, Map<number, { sum: number; count: number }>>();
      for (const row of rows) {
        const month = new Date(row.price_date).getMonth() + 1;
        if (!catMap.has(row.category)) catMap.set(row.category, new Map());
        const monthMap = catMap.get(row.category)!;
        const existing = monthMap.get(month) ?? { sum: 0, count: 0 };
        monthMap.set(month, { sum: existing.sum + row.price_per_kg, count: existing.count + 1 });
      }

      const results: SeasonalEntry[] = [];
      for (const [category, monthMap] of catMap) {
        const monthlyAvg: Record<number, number> = {};
        let bestMonth: number | null = null;
        let bestPrice = -1;
        for (const [month, { sum, count }] of monthMap) {
          const avg = sum / count / 100;
          monthlyAvg[month] = avg;
          if (avg > bestPrice) { bestPrice = avg; bestMonth = month; }
        }
        results.push({ category, monthlyAvg, bestMonth });
      }
      if (results.length > 0) return results;
    }
  } catch { /* fall through to synthetic */ }

  // Fallback: synthetic seasonal patterns
  return mlaCategories.map((category) => {
    const basePrice = defaultFallbackPrice(category);
    const monthlyAvg: Record<number, number> = {};
    let bestMonth: number | null = null;
    let bestPrice = -1;
    for (let m = 1; m <= 12; m++) {
      const price = basePrice * (SEASONAL_MULTIPLIERS[m] ?? 1.0);
      monthlyAvg[m] = price;
      if (price > bestPrice) { bestPrice = price; bestMonth = m; }
    }
    return { category, monthlyAvg, bestMonth };
  });
}
