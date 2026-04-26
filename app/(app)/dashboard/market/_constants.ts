export const MLA_CATEGORIES = [
  "Grown Steer",
  "Grown Heifer",
  "Grown Bull",
  "Yearling Steer",
  "Yearling Heifer",
  "Weaner Steer",
  "Heifer",
  "Cows",
] as const;

// Short clarifications for categories whose name is ambiguous on its own. The
// MLA scraper stores "Heifer" for the lightweight (under-300kg) heifer class
// but never uses the symmetric "Weaner Heifer" string, so the tile reads as
// "Heifer" without context. This map surfaces the weight bracket on the tile
// so producers can place it next to "Weaner Steer" in their head.
export const MLA_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  Heifer: "Weaner heifers, under 300kg",
  "Weaner Steer": "Weaner steers, under 330kg",
  "Yearling Heifer": "Yearling heifers, 300 to 450kg",
  "Yearling Steer": "Yearling steers, 330 to 500kg",
  "Grown Heifer": "Grown heifers, over 450kg",
  "Grown Steer": "Grown steers, over 500kg",
  "Grown Bull": "Bulls, all weights",
  Cows: "Cows, all weights",
};

export const AU_STATES = ["NSW", "QLD", "VIC", "SA", "WA", "TAS"] as const;

export type PriceRow = {
  category: string;
  saleyard: string;
  state: string;
  final_price_per_kg: number;
  weight_range: string | null;
  data_date: string;
};

export type WeeklyPoint = {
  week_date: string;
  avg_price: number;
  saleyards: number;
  sales: number;
};

export type CategorySummary = {
  category: string;
  slug: string;
  latest_price: number;
  latest_date: string;
  change_1w_pct: number | null;
  change_4w_pct: number | null;
  change_12w_pct: number | null;
  change_52w_pct: number | null;
  sparkline: WeeklyPoint[];
  saleyard_count: number;
};

export type SaleyardSummary = {
  saleyard: string;
  slug: string;
  state: string;
  latest_avg: number;
  latest_date: string;
  change_1w_pct: number | null;
  change_4w_pct: number | null;
  sales: number;
};

export type Mover = {
  kind: "category" | "saleyard";
  name: string;
  slug: string;
  href: string;
  latest_price: number;
  change_pct: number;
  subtitle?: string;
};

export type SeasonalityCell = {
  year: number;
  month: number;
  avg_price: number | null;
  samples: number;
};

export type YearWeeklyPoint = {
  week: number; // 1-53, approximates week-of-year
  avg_price: number | null;
};

export type YearOverlaySeries = {
  year: number;
  points: YearWeeklyPoint[];
};

export type CategoryTimelineRow = {
  week_date: string;
} & Record<string, number | string | null>;

export type HerdExposure = {
  category: string;
  slug: string;
  head_count: number;
  herd_count: number;
  avg_weight: number;
};

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export function formatAUDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${parseInt(d)}/${parseInt(m)}/${y.slice(2)}`;
}
