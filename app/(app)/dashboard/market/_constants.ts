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
