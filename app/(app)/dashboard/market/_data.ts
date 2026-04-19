import "server-only";
import { createClient } from "@/lib/supabase/server";
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
  const startDate = daysAgo(420);
  const results = await Promise.all(
    MLA_CATEGORIES.map(async (category) => {
      const rows = await fetchPriceRows({ category, startDate, state, limit: 20000 });
      const series = aggregateWeekly(rows);
      if (series.length === 0) return null;
      const latest = series[series.length - 1];
      const pick = (weeksBack: number) => {
        const target = series[series.length - 1 - weeksBack];
        if (!target) return null;
        return pctChange(latest.avg_price, target.avg_price);
      };
      const summary: CategorySummary = {
        category,
        slug: slugify(category),
        latest_price: latest.avg_price,
        latest_date: latest.week_date,
        change_1w_pct: pick(1),
        change_4w_pct: pick(4),
        change_12w_pct: pick(12),
        change_52w_pct: pick(52),
        sparkline: series.slice(-12),
        saleyard_count: latest.saleyards,
      };
      return summary;
    })
  );
  return results
    .filter((r): r is CategorySummary => r !== null)
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
  const startDate = daysAgo(windowDays + 14);
  const rows = await fetchPriceRows({ startDate, state, limit: 20000 });

  const catByDate = new Map<string, Map<string, { total: number; count: number }>>();
  const yardByDate = new Map<string, Map<string, { total: number; count: number; state: string }>>();

  for (const r of rows) {
    const cm = catByDate.get(r.category) ?? new Map();
    const c = cm.get(r.data_date) ?? { total: 0, count: 0 };
    c.total += r.final_price_per_kg;
    c.count += 1;
    cm.set(r.data_date, c);
    catByDate.set(r.category, cm);

    const ym = yardByDate.get(r.saleyard) ?? new Map();
    const y = ym.get(r.data_date) ?? { total: 0, count: 0, state: r.state };
    y.total += r.final_price_per_kg;
    y.count += 1;
    ym.set(r.data_date, y);
    yardByDate.set(r.saleyard, ym);
  }

  const movers: Mover[] = [];

  const pushSeries = (
    kind: "category" | "saleyard",
    name: string,
    dateMap: Map<string, { total: number; count: number; state?: string }>,
    subtitle?: string
  ) => {
    const dates = Array.from(dateMap.keys()).sort();
    if (dates.length < 2) return;
    const latestKey = dates[dates.length - 1];
    const latest = dateMap.get(latestKey)!;
    const latestAvg = latest.total / latest.count / 100;
    let priorKey: string | undefined;
    for (let i = dates.length - 2; i >= 0; i--) {
      const diff =
        (new Date(latestKey).getTime() - new Date(dates[i]).getTime()) / 86_400_000;
      if (diff >= windowDays - 3) {
        priorKey = dates[i];
        break;
      }
    }
    if (!priorKey) return;
    const prior = dateMap.get(priorKey)!;
    const priorAvg = prior.total / prior.count / 100;
    const change = pctChange(latestAvg, priorAvg);
    if (change === null) return;
    const slug = slugify(name);
    movers.push({
      kind,
      name,
      slug,
      href: kind === "category" ? `/dashboard/market/category/${slug}` : `/dashboard/market/saleyard/${slug}`,
      latest_price: latestAvg,
      change_pct: change,
      subtitle,
    });
  };

  for (const [cat, dm] of catByDate) {
    pushSeries("category", cat, dm, "Category");
  }
  for (const [yard, dm] of yardByDate) {
    const firstEntry = dm.values().next().value;
    const st = firstEntry?.state;
    pushSeries("saleyard", yard, dm, st);
  }

  const sorted = movers.slice().sort((a, b) => b.change_pct - a.change_pct);
  return {
    gainers: sorted.slice(0, 5),
    losers: sorted.slice(-5).reverse(),
  };
}

export async function getHerdExposure(userId: string): Promise<HerdExposure[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("herds")
    .select("category, head_count, current_weight")
    .eq("user_id", userId)
    .eq("is_sold", false)
    .eq("is_deleted", false);
  if (!data || data.length === 0) return [];
  const groups = new Map<string, { head: number; herds: number; weightSum: number }>();
  for (const h of data as Array<{ category: string | null; head_count: number | null; current_weight: number | null }>) {
    if (!h.category) continue;
    const g = groups.get(h.category) ?? { head: 0, herds: 0, weightSum: 0 };
    g.head += h.head_count ?? 0;
    g.herds += 1;
    g.weightSum += (h.current_weight ?? 0) * (h.head_count ?? 0);
    groups.set(h.category, g);
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

function dayOfYearFromYMD(year: number, month: number, day: number): number {
  const date = new Date(Date.UTC(year, month - 1, day));
  const start = new Date(Date.UTC(year, 0, 1));
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000) + 1;
}

export async function getYearOverYearMonthly(opts: {
  state?: string;
  years?: number;
}): Promise<YearOverlaySeries[]> {
  const yearsBack = opts.years ?? 3;
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const startYear = currentYear - (yearsBack - 1);

  const supabase = await createClient();

  // Supabase PostgREST caps each request, so paginate with .range() until we
  // drain the window. One request chain per year runs in parallel across years.
  const PAGE = 1000;
  const byYearMonth = new Map<string, { total: number; count: number }>();

  const years = Array.from({ length: yearsBack }, (_, i) => startYear + i);

  await Promise.all(
    years.map(async (year) => {
      const startDate = `${year}-01-01`;
      const endExclusive = `${year + 1}-01-01`;

      let from = 0;
      while (true) {
        let q = supabase
          .from("category_prices")
          .select("final_price_per_kg, data_date")
          .gte("data_date", startDate)
          .lt("data_date", endExclusive)
          .order("data_date", { ascending: true })
          .range(from, from + PAGE - 1);
        if (opts.state) q = q.eq("state", opts.state);
        const { data, error } = await q;
        if (error || !data) break;
        for (const r of data as Array<{ final_price_per_kg: number; data_date: string }>) {
          const [ys, ms, ds] = r.data_date.split("-");
          const dayOfYear = dayOfYearFromYMD(parseInt(ys), parseInt(ms), parseInt(ds));
          const week = Math.min(53, Math.max(1, Math.ceil(dayOfYear / 7)));
          const key = `${ys}-${String(week).padStart(2, "0")}`;
          const g = byYearMonth.get(key) ?? { total: 0, count: 0 };
          g.total += r.final_price_per_kg;
          g.count += 1;
          byYearMonth.set(key, g);
        }
        if (data.length < PAGE) break;
        from += PAGE;
      }
    })
  );

  const series: YearOverlaySeries[] = [];
  for (let y = startYear; y <= currentYear; y++) {
    const points: YearWeeklyPoint[] = Array.from({ length: 53 }, (_, i) => {
      const key = `${y}-${String(i + 1).padStart(2, "0")}`;
      const g = byYearMonth.get(key);
      return {
        week: i + 1,
        avg_price: g && g.count > 0 ? g.total / g.count / 100 : null,
      };
    });
    series.push({ year: y, points });
  }
  return series;
}

export async function getCategoryTimelineWeekly(opts: {
  state?: string;
  years?: number;
}): Promise<CategoryTimelineRow[]> {
  const yearsBack = opts.years ?? 2;
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const startYear = currentYear - yearsBack;

  const supabase = await createClient();
  const PAGE = 1000;

  // weekDate -> category -> { total, count }
  const byDateCat = new Map<string, Map<string, { total: number; count: number }>>();

  const years = Array.from({ length: yearsBack + 1 }, (_, i) => startYear + i);

  await Promise.all(
    years.map(async (year) => {
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year + 1}-01-01`;
      let from = 0;
      while (true) {
        let q = supabase
          .from("category_prices")
          .select("category, final_price_per_kg, data_date")
          .gte("data_date", yearStart)
          .lt("data_date", yearEnd)
          .order("data_date", { ascending: true })
          .range(from, from + PAGE - 1);
        if (opts.state) q = q.eq("state", opts.state);
        const { data, error } = await q;
        if (error || !data) break;
        for (const r of data as Array<{ category: string; final_price_per_kg: number; data_date: string }>) {
          const m = byDateCat.get(r.data_date) ?? new Map();
          const g = m.get(r.category) ?? { total: 0, count: 0 };
          g.total += r.final_price_per_kg;
          g.count += 1;
          m.set(r.category, g);
          byDateCat.set(r.data_date, m);
        }
        if (data.length < PAGE) break;
        from += PAGE;
      }
    })
  );

  // Keep only the rolling window from (today - yearsBack*365) to today
  const cutoff = daysAgo(yearsBack * 365);
  const dates = Array.from(byDateCat.keys()).filter((d) => d >= cutoff).sort();

  return dates.map((date) => {
    const row: CategoryTimelineRow = { week_date: date };
    const catMap = byDateCat.get(date)!;
    for (const [cat, g] of catMap) {
      row[cat] = g.count > 0 ? g.total / g.count / 100 : null;
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
