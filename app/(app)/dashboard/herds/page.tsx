import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { HerdsTable } from "./herds-table";
import { Plus, Tags, Layers, DollarSign, Scale } from "lucide-react";
import { calculateHerdValuation, mapCategoryToMLACategory, type CategoryPriceEntry } from "@/lib/engines/valuation-engine";
import { cattleBreedPremiums, resolveMLASaleyardName } from "@/lib/data/reference-data";

export const metadata = {
  title: "Herds",
};

export default async function HerdsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [herdsResult, { data: nationalPrices }, { data: breedPremiumData }, { data: propertiesData }] = await Promise.all([
    supabase
      .from("herd_groups")
      .select("*, properties(property_name)")
      .eq("user_id", user!.id)
      .eq("is_sold", false)
      .eq("is_deleted", false)
      .order("name"),
    supabase
      .from("category_prices")
      .select("category, price_per_kg:final_price_per_kg, weight_range")
      .eq("saleyard", "National")
      .is("breed", null),
    supabase
      .from("breed_premiums")
      .select("breed, premium_percent:premium_pct"),
    supabase
      .from("properties")
      .select("id, property_name, is_default")
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .order("property_name"),
  ]);

  let herds = herdsResult.data;
  const error = herdsResult.error;

  // Fallback: if the join fails, query without it so herds still display
  if (error && !herds) {
    const fallback = await supabase
      .from("herd_groups")
      .select("*")
      .eq("user_id", user!.id)
      .eq("is_sold", false)
      .eq("is_deleted", false)
      .order("name");
    herds = fallback.data?.map((h) => ({ ...h, properties: null })) ?? null;
  }

  // Fetch saleyard-specific prices for herds that have a selected_saleyard
  // No breed filter - MLA saleyard data is mostly breed-specific (breed IS NOT NULL).
  // General (breed=null) and breed-specific entries are separated into two maps.
  // Filter by mapped MLA categories to stay under PostgREST's 1000-row default limit
  // (a single saleyard can have 7000+ rows across all categories).
  const saleyards = [...new Set((herds ?? []).map((h) => h.selected_saleyard ? resolveMLASaleyardName(h.selected_saleyard) : null).filter(Boolean))] as string[];
  const mlaCategories = [...new Set((herds ?? []).map((h) => mapCategoryToMLACategory(h.category)))];
  let saleyardPricesRaw: { category: string; price_per_kg: number; weight_range: string | null; saleyard: string; breed: string | null }[] = [];
  if (saleyards.length > 0 && mlaCategories.length > 0) {
    const { data } = await supabase
      .from("category_prices")
      .select("category, price_per_kg:final_price_per_kg, weight_range, saleyard, breed")
      .in("saleyard", saleyards)
      .in("category", mlaCategories);
    saleyardPricesRaw = data ?? [];
  }

  // Build pricing lookup maps
  const nationalPriceMap = new Map<string, CategoryPriceEntry[]>();
  for (const p of (nationalPrices ?? [])) {
    const entries = nationalPriceMap.get(p.category) ?? [];
    entries.push({ price_per_kg: p.price_per_kg / 100, weight_range: p.weight_range });
    nationalPriceMap.set(p.category, entries);
  }
  // General saleyard prices (breed=null) - safe to apply breed premium
  const saleyardPriceMap = new Map<string, CategoryPriceEntry[]>();
  // Breed-specific saleyard prices - breed premium already baked in (double-application guard)
  const saleyardBreedPriceMap = new Map<string, CategoryPriceEntry[]>();
  for (const p of saleyardPricesRaw) {
    if (p.breed === null) {
      const key = `${p.category}|${p.saleyard}`;
      const entries = saleyardPriceMap.get(key) ?? [];
      entries.push({ price_per_kg: p.price_per_kg / 100, weight_range: p.weight_range });
      saleyardPriceMap.set(key, entries);
    } else {
      const key = `${p.category}|${p.breed}|${p.saleyard}`;
      const entries = saleyardBreedPriceMap.get(key) ?? [];
      entries.push({ price_per_kg: p.price_per_kg / 100, weight_range: p.weight_range });
      saleyardBreedPriceMap.set(key, entries);
    }
  }
  // Seed with local breed premiums, then let Supabase override (matches iOS BreedPremiumService)
  const premiumMap = new Map<string, number>(Object.entries(cattleBreedPremiums));
  for (const b of (breedPremiumData ?? [])) {
    premiumMap.set(b.breed, b.premium_percent);
  }

  // Compute per-herd valuations with price source tracking
  const herdValuesObj: Record<string, number> = {};
  const herdSourcesObj: Record<string, string> = {};
  let totalValue = 0;
  for (const h of (herds ?? [])) {
    const result = calculateHerdValuation(
      h as Parameters<typeof calculateHerdValuation>[0],
      nationalPriceMap, premiumMap, undefined, saleyardPriceMap, saleyardBreedPriceMap
    );
    herdValuesObj[h.id] = result.netValue;
    herdSourcesObj[h.id] = result.priceSource;
    totalValue += result.netValue;
  }

  // Build property groups: default first, then alphabetical, then "Unassigned"
  const propertyGroups = (propertiesData ?? [])
    .sort((a, b) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return a.property_name.localeCompare(b.property_name);
    })
    .map((p) => ({ id: p.id, name: p.property_name, isDefault: p.is_default }));

  const totalHead =
    herds?.reduce((sum, h) => sum + (h.head_count ?? 0), 0) ?? 0;

  const avgWeight =
    herds && herds.length > 0
      ? Math.round(
          herds.reduce((sum, h) => sum + (h.current_weight ?? 0), 0) /
            herds.filter((h) => h.current_weight > 0).length || 0
        )
      : 0;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Herds"
        subtitle="Manage your livestock herds."
        actions={
          <Link href="/dashboard/herds/new">
            <Button>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Herd
            </Button>
          </Link>
        }
      />

      {!herds || herds.length === 0 ? (
        <Card>
          <EmptyState
            title="No herds yet"
            description="Add your first herd to start tracking your livestock."
            actionLabel="Add Herd"
            actionHref="/dashboard/herds/new"
          />
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-inset ring-white/8 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/15">
                  <DollarSign className="h-4 w-4 text-brand" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-text-muted">Total Value</p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums text-text-primary">
                    ${Math.round(totalValue).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-inset ring-white/8 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/15">
                  <Tags className="h-4 w-4 text-brand" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-text-muted">Total Head</p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums text-text-primary">{totalHead.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-inset ring-white/8 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/15">
                  <Layers className="h-4 w-4 text-brand" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-text-muted">Herds</p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums text-text-primary">{herds.length}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-inset ring-white/8 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/15">
                  <Scale className="h-4 w-4 text-brand" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-text-muted">Avg Weight</p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums text-text-primary">
                    {avgWeight > 0 ? `${avgWeight} kg` : "\u2014"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <HerdsTable herds={herds} herdValues={herdValuesObj} herdSources={herdSourcesObj} propertyGroups={propertyGroups} />
        </>
      )}
    </div>
  );
}
