import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { isAdminEmail } from "@/lib/data/admin";
import {
  calculateHerdValuation,
  mapCategoryToMLACategory,
  type CategoryPriceEntry,
  type HerdValuationResult,
} from "@/lib/engines/valuation-engine";
import { cattleBreedPremiums, resolveMLASaleyardName } from "@/lib/data/reference-data";
import { ValuationValidator } from "./valuation-validator";

export const revalidate = 0;

export const metadata = { title: "Valuation Validator - Admin" };

export interface HerdWithValuation {
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
  is_breeder: boolean;
  is_pregnant: boolean;
  joined_date: string | null;
  calving_rate: number;
  breeding_program_type: string | null;
  joining_period_start: string | null;
  joining_period_end: string | null;
  breed_premium_override: number | null;
  mortality_rate: number | null;
  selected_saleyard: string | null;
  valuation: HerdValuationResult;
}

export type SerializedPriceMaps = {
  national: Record<string, CategoryPriceEntry[]>;
  saleyard: Record<string, CategoryPriceEntry[]>;
  saleyardBreed: Record<string, CategoryPriceEntry[]>;
  premium: Record<string, number>;
};

export interface SaleyardStats {
  name: string;
  totalEntries: number;
  newestDataDate: string | null;
  oldestDataDate: string | null;
  categories: string[];
  breeds: string[];
  weightRanges: string[];
  hasBreedSpecific: boolean;
  herdsUsing: number;
};

export default async function ValuationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");
  if (!isAdminEmail(user.email)) redirect("/dashboard");

  // Fetch herds (same query as dashboard)
  const { data: herds } = await supabase
    .from("herd_groups")
    .select(`id, name, species, breed, category, head_count,
             initial_weight, current_weight, daily_weight_gain,
             dwg_change_date, previous_dwg, created_at,
             is_breeder, is_pregnant, joined_date, calving_rate,
             breeding_program_type, joining_period_start, joining_period_end,
             breed_premium_override, mortality_rate, is_sold, selected_saleyard`)
    .eq("user_id", user.id)
    .eq("is_sold", false)
    .eq("is_deleted", false)
    .order("name");

  const activeHerds = herds ?? [];

  // Fetch pricing data (same as dashboard)
  const saleyards = [...new Set(
    activeHerds
      .map((h) => h.selected_saleyard ? resolveMLASaleyardName(h.selected_saleyard) : null)
      .filter(Boolean),
  )] as string[];
  const mlaCategories = [...new Set(activeHerds.map((h) => mapCategoryToMLACategory(h.category)))];
  const saleyardsToFetch = [...saleyards, "National"];

  // Fetch ALL saleyard pricing data for the Saleyard Status tab
  const { data: allSaleyardPrices } = await supabase
    .from("category_prices")
    .select("category, saleyard, breed, weight_range, data_date")
    .neq("saleyard", "National")
    .order("data_date", { ascending: false })
    .limit(100000);

  // Aggregate saleyard stats
  const saleyardStatsMap = new Map<string, {
    entries: number;
    newest: string | null;
    oldest: string | null;
    categories: Set<string>;
    breeds: Set<string>;
    weightRanges: Set<string>;
    hasBreedSpecific: boolean;
  }>();

  for (const p of (allSaleyardPrices ?? [])) {
    let stats = saleyardStatsMap.get(p.saleyard);
    if (!stats) {
      stats = { entries: 0, newest: null, oldest: null, categories: new Set(), breeds: new Set(), weightRanges: new Set(), hasBreedSpecific: false };
      saleyardStatsMap.set(p.saleyard, stats);
    }
    stats.entries++;
    if (!stats.newest || p.data_date > stats.newest) stats.newest = p.data_date;
    if (!stats.oldest || p.data_date < stats.oldest) stats.oldest = p.data_date;
    stats.categories.add(p.category);
    if (p.breed) { stats.breeds.add(p.breed); stats.hasBreedSpecific = true; }
    if (p.weight_range) stats.weightRanges.add(p.weight_range);
  }

  // Count herds per saleyard
  const herdSaleyardCounts = new Map<string, number>();
  for (const h of activeHerds) {
    if (h.selected_saleyard) {
      const resolved = resolveMLASaleyardName(h.selected_saleyard);
      herdSaleyardCounts.set(resolved, (herdSaleyardCounts.get(resolved) ?? 0) + 1);
    }
  }

  const saleyardStatsList: SaleyardStats[] = Array.from(saleyardStatsMap.entries())
    .map(([name, s]) => ({
      name,
      totalEntries: s.entries,
      newestDataDate: s.newest,
      oldestDataDate: s.oldest,
      categories: Array.from(s.categories).sort(),
      breeds: Array.from(s.breeds).sort(),
      weightRanges: Array.from(s.weightRanges).sort(),
      hasBreedSpecific: s.hasBreedSpecific,
      herdsUsing: herdSaleyardCounts.get(name) ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const [{ data: allPrices }, { data: breedPremiumData }] = await Promise.all([
    mlaCategories.length > 0
      ? supabase
          .from("category_prices")
          .select("category, price_per_kg:final_price_per_kg, weight_range, saleyard, breed, data_date")
          .in("saleyard", saleyardsToFetch)
          .in("category", mlaCategories)
          .order("data_date", { ascending: false })
          .limit(50000)
      : Promise.resolve({ data: [] as { category: string; price_per_kg: number; weight_range: string | null; saleyard: string; breed: string | null; data_date: string }[] }),
    supabase.from("breed_premiums").select("breed, premium_percent:premium_pct"),
  ]);

  // Build price maps
  const nationalPriceMap = new Map<string, CategoryPriceEntry[]>();
  const saleyardPriceMap = new Map<string, CategoryPriceEntry[]>();
  const saleyardBreedPriceMap = new Map<string, CategoryPriceEntry[]>();
  for (const p of (allPrices ?? [])) {
    const priceEntry = { price_per_kg: p.price_per_kg / 100, weight_range: p.weight_range, data_date: p.data_date };
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

  // Run valuations
  const herdsWithValuations: HerdWithValuation[] = activeHerds.map((h) => {
    const valuation = calculateHerdValuation(
      h as Parameters<typeof calculateHerdValuation>[0],
      nationalPriceMap, premiumMap, undefined, saleyardPriceMap, saleyardBreedPriceMap,
    );
    return { ...h, valuation };
  });

  // Serialize maps for client components (Map is not serializable)
  const serializedMaps: SerializedPriceMaps = {
    national: Object.fromEntries(nationalPriceMap),
    saleyard: Object.fromEntries(saleyardPriceMap),
    saleyardBreed: Object.fromEntries(saleyardBreedPriceMap),
    premium: Object.fromEntries(premiumMap),
  };

  return (
    <div className="max-w-[1600px]">
      <PageHeader
        title="Valuation Validator"
        subtitle="Full calculation breakdown for every herd. Compare intermediate values to verify correctness."
      />
      <ValuationValidator herds={herdsWithValuations} priceMaps={serializedMaps} saleyardStats={saleyardStatsList} />
    </div>
  );
}
