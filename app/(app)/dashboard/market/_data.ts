import "server-only";
import { createClient } from "@/lib/supabase/server";
import { resolveMLACategory } from "@/lib/data/weight-mapping";
import {
  MLA_CATEGORIES,
  daysAgo,
  slugify,
  type PriceRow,
  type WeeklyPoint,
  type CategorySummary,
  type SaleyardSummary,
  type Mover,
  type SeasonalityCell,
  type HerdExposure,
  type YearOverlaySeries,
  type YearWeeklyPoint,
  type CategoryTimelineRow,
} from "./_constants";

export {
  MLA_CATEGORIES,
  AU_STATES,
  daysAgo,
  slugify,
  formatAUDate,
} from "./_constants";

export type {
  PriceRow,
  WeeklyPoint,
  CategorySummary,
  SaleyardSummary,
  Mover,
  SeasonalityCell,
  HerdExposure,
  YearWeeklyPoint,
  YearOverlaySeries,
  CategoryTimelineRow,
} from "./_constants";

function pctChange(current: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((current - prev) / prev) * 100;
}

type PriceFetch = {
  startDate?: string;
  endDate?: string;
  state?: string;
  category?: string;
  saleyard?: string;
  limit?: number;
};

async function fetchPriceRows(opts: PriceFetch): Promise<PriceRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("category_prices")
    .select("category, saleyard, state, final_price_per_kg, weight_range, data_date")
    .order("data_date", { ascending: true });
  if (opts.startDate) q = q.gte("data_date", opts.startDate);
  if (opts.endDate) q = q.lte("data_date", opts.endDate);
  if (opts.state) q = q.eq("state", opts.state);
  if (opts.category) q = q.eq("category", opts.category);
  if (opts.saleyard) q = q.eq("saleyard", opts.saleyard);
  q = q.limit(opts.limit ?? 20000);
  const { data } = await q;
  return (data as PriceRow[]) ?? [];
}

export function aggregateWeekly(rows: PriceRow[]): WeeklyPoint[] {
  const groups = new Map<string, { total: number; count: number; yards: Set<string> }>();
  for (const r of rows) {
    const g = groups.get(r.data_date) ?? { total: 0, count: 0, yards: new Set<string>() };
    g.total += r.final_price_per_kg;
    g.count += 1;
    g.yards.add(r.saleyard);
    groups.set(r.data_date, g);
  }
  return Array.from(groups.entries())
    .map(([week_date, g]) => ({
      week_date,
      avg_price: g.total / g.count / 100,
      saleyards: g.yards.size,
      sales: g.count,
    }))
    .sort((a, b) => a.week_date.localeCompare(b.week_date));
}

export async function getCategorySummaries(state?: string): Promise<CategorySummary[]> {
  // Aggregated in Postgres via market_category_summaries RPC - returns 8 rows
  // (one per MLA category) with latest price, change %%s, and sparkline jsonb.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("market_category_summaries", {
    p_state: state ?? null,
    p_days: 420,
  });
  if (error || !data) return [];
  type Row = {
    category: string;
    latest_price: number;
    latest_date: string;
    change_1w_pct: number | null;
    change_4w_pct: number | null;
    change_12w_pct: number | null;
    change_52w_pct: number | null;
    saleyard_count: number;
    sparkline: WeeklyPoint[];
  };
  return (data as Row[])
    .map((r) => ({
      category: r.category,
      slug: slugify(r.category),
      latest_price: Number(r.latest_price),
      latest_date: r.latest_date,
      change_1w_pct: r.change_1w_pct,
      change_4w_pct: r.change_4w_pct,
      change_12w_pct: r.change_12w_pct,
      change_52w_pct: r.change_52w_pct,
      sparkline: r.sparkline ?? [],
      saleyard_count: r.saleyard_count,
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

export async function getCategorySeries(opts: {
  category: string;
  state?: string;
  startDate?: string;
  endDate?: string;
}): Promise<WeeklyPoint[]> {
  const rows = await fetchPriceRows({
    category: opts.category,
    state: opts.state,
    startDate: opts.startDate,
    endDate: opts.endDate,
    limit: 50000,
  });
  return aggregateWeekly(rows);
}

export async function getSaleyardSummaries(state?: string): Promise<SaleyardSummary[]> {
  const startDate = daysAgo(42);
  const rows = await fetchPriceRows({ startDate, state, limit: 20000 });

  const byYard = new Map<string, { state: string; byDate: Map<string, { total: number; count: number }> }>();
  for (const r of rows) {
    const yard = byYard.get(r.saleyard) ?? { state: r.state, byDate: new Map() };
    const d = yard.byDate.get(r.data_date) ?? { total: 0, count: 0 };
    d.total += r.final_price_per_kg;
    d.count += 1;
    yard.byDate.set(r.data_date, d);
    byYard.set(r.saleyard, yard);
  }

  const summaries: SaleyardSummary[] = [];
  for (const [saleyard, info] of byYard) {
    const dates = Array.from(info.byDate.keys()).sort();
    if (dates.length === 0) continue;
    const latestDate = dates[dates.length - 1];
    const latest = info.byDate.get(latestDate)!;
    const latestAvg = latest.total / latest.count / 100;
    const weekAgo = dates[dates.length - 2];
    const monthAgo = dates.find((d) => {
      const diff =
        (new Date(latestDate).getTime() - new Date(d).getTime()) / 86_400_000;
      return diff >= 25 && diff <= 35;
    });
    const pickAvg = (k: string | undefined) => {
      if (!k) return null;
      const row = info.byDate.get(k);
      if (!row) return null;
      return row.total / row.count / 100;
    };
    const waAvg = pickAvg(weekAgo);
    const maAvg = pickAvg(monthAgo);
    summaries.push({
      saleyard,
      slug: slugify(saleyard),
      state: info.state,
      latest_avg: latestAvg,
      latest_date: latestDate,
      change_1w_pct: waAvg !== null ? pctChange(latestAvg, waAvg) : null,
      change_4w_pct: maAvg !== null ? pctChange(latestAvg, maAvg) : null,
      sales: latest.count,
    });
  }
  return summaries.sort((a, b) => b.latest_avg - a.latest_avg);
}

export async function getSaleyardSeries(opts: {
  saleyard: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ all: WeeklyPoint[]; byCategory: Record<string, WeeklyPoint[]> }> {
  const rows = await fetchPriceRows({
    saleyard: opts.saleyard,
    category: opts.category,
    startDate: opts.startDate,
    endDate: opts.endDate,
    limit: 50000,
  });
  const byCat: Record<string, PriceRow[]> = {};
  for (const r of rows) {
    (byCat[r.category] ??= []).push(r);
  }
  const byCategory: Record<string, WeeklyPoint[]> = {};
  for (const [cat, arr] of Object.entries(byCat)) {
    byCategory[cat] = aggregateWeekly(arr);
  }
  return { all: aggregateWeekly(rows), byCategory };
}

export async function getSeasonalityMatrix(opts: {
  category: string;
  state?: string;
  years?: number;
}): Promise<{ years: number[]; cells: SeasonalityCell[]; yearAverages: Record<number, number> }> {
  const years = opts.years ?? 5;
  const startDate = daysAgo(years * 365 + 30);
  const rows = await fetchPriceRows({
    category: opts.category,
    state: opts.state,
    startDate,
    limit: 50000,
  });
  const groups = new Map<string, { total: number; count: number }>();
  for (const r of rows) {
    const [y, m] = r.data_date.split("-");
    const key = `${y}-${m}`;
    const g = groups.get(key) ?? { total: 0, count: 0 };
    g.total += r.final_price_per_kg;
    g.count += 1;
    groups.set(key, g);
  }
  const cells: SeasonalityCell[] = [];
  const yearSet = new Set<number>();
  const yearTotals = new Map<number, { total: number; count: number }>();
  for (const [key, g] of groups) {
    const [ys, ms] = key.split("-");
    const year = parseInt(ys);
    const month = parseInt(ms);
    const avg = g.total / g.count / 100;
    cells.push({ year, month, avg_price: avg, samples: g.count });
    yearSet.add(year);
    const yt = yearTotals.get(year) ?? { total: 0, count: 0 };
    yt.total += g.total;
    yt.count += g.count;
    yearTotals.set(year, yt);
  }
  const yearAverages: Record<number, number> = {};
  for (const [y, { total, count }] of yearTotals) {
    yearAverages[y] = total / count / 100;
  }
  return {
    years: Array.from(yearSet).sort(),
    cells,
    yearAverages,
  };
}

export async function getTopMovers(
  windowDays: 7 | 30,
  state?: string
): Promise<{ gainers: Mover[]; losers: Mover[] }> {
  // Aggregated via market_top_movers RPC - returns up to 10 rows (top 5
  // gainers + top 5 losers across both categories and saleyards).
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("market_top_movers", {
    p_state: state ?? null,
    p_window_days: windowDays,
  });
  if (error || !data) return { gainers: [], losers: [] };
  type Row = {
    kind: "category" | "saleyard";
    name: string;
    state: string | null;
    latest_price: number;
    change_pct: number;
    gainer_rank: number | null;
    loser_rank: number | null;
  };
  const toMover = (r: Row): Mover => {
    const slug = slugify(r.name);
    return {
      kind: r.kind,
      name: r.name,
      slug,
      href: r.kind === "category"
        ? `/dashboard/market/category/${slug}`
        : `/dashboard/market/saleyard/${slug}`,
      latest_price: Number(r.latest_price),
      change_pct: Number(r.change_pct),
      subtitle: r.kind === "category" ? "Category" : r.state ?? undefined,
    };
  };
  const rows = data as Row[];
  const gainers = rows
    .filter((r) => r.gainer_rank !== null)
    .sort((a, b) => (a.gainer_rank ?? 99) - (b.gainer_rank ?? 99))
    .map(toMover);
  const losers = rows
    .filter((r) => r.loser_rank !== null)
    .sort((a, b) => (a.loser_rank ?? 99) - (b.loser_rank ?? 99))
    .map(toMover);
  return { gainers, losers };
}

export async function getHerdExposure(userId: string): Promise<HerdExposure[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("herds")
    .select("category, breeder_sub_type, head_count, current_weight, initial_weight")
    .eq("user_id", userId)
    .eq("is_sold", false)
    .eq("is_deleted", false);
  if (!data || data.length === 0) return [];

  // Roll up by *MLA category* (Grown Steer / Yearling Heifer / Cows / ...)
  // rather than the master category (Steer / Heifer / Breeder / ...). The
  // market page's summaries, category pages, and category tile overlays
  // all use MLA categories as keys, so exposure grouped by master would
  // never intersect and would emit /dashboard/market/category/<master-
  // slug> links that 404 in resolveSlug.
  type Row = {
    category: string | null;
    breeder_sub_type: string | null;
    head_count: number | null;
    current_weight: number | null;
    initial_weight: number | null;
  };

  const groups = new Map<string, { head: number; herds: number; weightSum: number }>();
  for (const h of data as Row[]) {
    if (!h.category) continue;
    const weightForResolve = h.initial_weight ?? h.current_weight ?? 0;
    const resolution = resolveMLACategory(
      h.category,
      weightForResolve,
      h.breeder_sub_type ?? undefined,
    );
    const mlaCat = resolution.primaryMLACategory;
    const g = groups.get(mlaCat) ?? { head: 0, herds: 0, weightSum: 0 };
    g.head += h.head_count ?? 0;
    g.herds += 1;
    g.weightSum += (h.current_weight ?? 0) * (h.head_count ?? 0);
    groups.set(mlaCat, g);
  }

  const out: HerdExposure[] = [];
  for (const [cat, g] of groups) {
    out.push({
      category: cat,
      slug: slugify(cat),
      head_count: g.head,
      herd_count: g.herds,
      avg_weight: g.head > 0 ? g.weightSum / g.head : 0,
    });
  }
  return out.sort((a, b) => b.head_count - a.head_count);
}

export async function getSaleyardsForState(state?: string): Promise<Array<{ saleyard: string; state: string }>> {
  const supabase = await createClient();
  let q = supabase
    .from("category_prices")
    .select("saleyard, state")
    .gte("data_date", daysAgo(60));
  if (state) q = q.eq("state", state);
  const { data } = await q.limit(10000);
  if (!data) return [];
  const seen = new Map<string, string>();
  for (const r of data as Array<{ saleyard: string; state: string }>) {
    if (!seen.has(r.saleyard)) seen.set(r.saleyard, r.state);
  }
  return Array.from(seen.entries())
    .map(([saleyard, state]) => ({ saleyard, state }))
    .sort((a, b) => a.saleyard.localeCompare(b.saleyard));
}

export async function getYearOverYearMonthly(opts: {
  state?: string;
  years?: number;
}): Promise<YearOverlaySeries[]> {
  const yearsBack = opts.years ?? 3;
  // Aggregated via market_yoy_weekly RPC - returns (year, week, avg_price)
  // triples directly from Postgres. Reshape into 53-slot arrays per year.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("market_yoy_weekly", {
    p_state: opts.state ?? null,
    p_years: yearsBack,
  });
  if (error || !data) return [];
  type Row = { year: number; week: number; avg_price: number };

  const byYear = new Map<number, Map<number, number>>();
  for (const r of data as Row[]) {
    const y = Number(r.year);
    const w = Number(r.week);
    const m = byYear.get(y) ?? new Map<number, number>();
    m.set(w, Number(r.avg_price));
    byYear.set(y, m);
  }

  const currentYear = new Date().getUTCFullYear();
  const startYear = currentYear - (yearsBack - 1);
  const series: YearOverlaySeries[] = [];
  for (let y = startYear; y <= currentYear; y++) {
    const yearMap = byYear.get(y);
    const points: YearWeeklyPoint[] = Array.from({ length: 53 }, (_, i) => ({
      week: i + 1,
      avg_price: yearMap?.get(i + 1) ?? null,
    }));
    series.push({ year: y, points });
  }
  return series;
}

export async function getCategoryTimelineWeekly(opts: {
  state?: string;
  years?: number;
}): Promise<CategoryTimelineRow[]> {
  const yearsBack = opts.years ?? 2;
  // Aggregated and pivoted via market_category_timeline_weekly RPC - returns
  // one row per date with one column per MLA category.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("market_category_timeline_weekly", {
    p_state: opts.state ?? null,
    p_years: yearsBack,
  });
  if (error || !data) return [];
  type Row = { week_date: string } & Record<string, number | string | null>;
  return (data as Row[]).map((r) => {
    const row: CategoryTimelineRow = { week_date: r.week_date };
    for (const cat of MLA_CATEGORIES) {
      const v = r[cat];
      row[cat] = v == null ? null : Number(v);
    }
    return row;
  });
}

export async function resolveSlug(
  kind: "category" | "saleyard",
  slug: string
): Promise<string | null> {
  if (kind === "category") {
    return MLA_CATEGORIES.find((c) => slugify(c) === slug) ?? null;
  }
  const saleyards = await getSaleyardsForState();
  return saleyards.find((s) => slugify(s.saleyard) === slug)?.saleyard ?? null;
}
