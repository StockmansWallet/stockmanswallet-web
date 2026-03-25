import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { isAdminEmail } from "@/lib/data/admin";
import {
  calculateHerdValuation,
  categoryFallback,
  type CategoryPriceEntry,
  type HerdValuationResult,
} from "@/lib/engines/valuation-engine";
import { resolveMLACategory } from "@/lib/data/weight-mapping";
import { cattleBreedPremiums, resolveMLASaleyardName } from "@/lib/data/reference-data";
import { expandWithNearbySaleyards } from "@/lib/data/saleyard-proximity";
import { ValuationValidator } from "./valuation-validator";

export const revalidate = 0;

export const metadata = { title: "Valuation Lab - Admin" };

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

export interface SaleyardCoverage {
  saleyard: string;
  categories: string[];
  breeds: string[];
}

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
    .from("herds")
    .select(`id, name, species, breed, category, head_count,
             initial_weight, current_weight, daily_weight_gain,
             dwg_change_date, previous_dwg, created_at,
             is_breeder, is_pregnant, joined_date, calving_rate,
             breeding_program_type, joining_period_start, joining_period_end,
             breed_premium_override, mortality_rate, is_sold, selected_saleyard,
             additional_info, calf_weight_recorded_date, updated_at,
             breeder_sub_type`)
    .eq("user_id", user.id)
    .eq("is_sold", false)
    .eq("is_deleted", false)
    .order("name");

  const activeHerds = herds ?? [];

  // Fetch pricing data in two parallel queries to avoid 50k limit truncating national prices
  const herdSaleyards = [...new Set(
    activeHerds
      .map((h) => h.selected_saleyard ? resolveMLASaleyardName(h.selected_saleyard) : null)
      .filter(Boolean),
  )] as string[];
  const saleyards = expandWithNearbySaleyards(herdSaleyards);
  const primaryCategories = [...new Set(activeHerds.map((h) => resolveMLACategory(h.category, h.initial_weight, h.breeder_sub_type ?? undefined).primaryMLACategory))];
  const mlaCategories = [...new Set([...primaryCategories, ...primaryCategories.map(c => categoryFallback(c)).filter((c): c is string => c !== null)])];

  type PriceRow = { category: string; price_per_kg: number; weight_range: string | null; saleyard: string; breed: string | null; data_date: string };
  const emptyPrices: PriceRow[] = [];

  // Fetch only the newest date's prices per saleyard+category via RPC.
  // This avoids the 50k PostgREST row limit that silently truncates multi-saleyard queries
  // when full history is fetched, causing inconsistent valuations across pages.
  const [{ data: rpcPrices }, { data: breedPremiumData }, { data: coverageData }] = await Promise.all([
    mlaCategories.length > 0
      ? supabase.rpc("latest_saleyard_prices", {
          p_saleyards: saleyards,
          p_categories: mlaCategories,
        }) as unknown as { data: PriceRow[] | null }
      : Promise.resolve({ data: emptyPrices }),
    supabase.from("breed_premiums").select("breed, premium_percent:premium_pct"),
    supabase.rpc("saleyard_coverage") as unknown as { data: SaleyardCoverage[] | null },
  ]);

  const allPrices = rpcPrices ?? [];

  // Build price maps
  const nationalPriceMap = new Map<string, CategoryPriceEntry[]>();
  const saleyardPriceMap = new Map<string, CategoryPriceEntry[]>();
  const saleyardBreedPriceMap = new Map<string, CategoryPriceEntry[]>();
  for (const p of allPrices) {
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
        title="Valuation Lab"
        titleClassName="text-4xl font-bold text-rose-400"
        subtitle="Full calculation breakdown for every herd. Compare intermediate values to verify correctness."
      />
      <ValuationValidator herds={herdsWithValuations} priceMaps={serializedMaps} saleyardCoverage={coverageData ?? []} />
    </div>
  );
}
