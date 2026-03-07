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

export const revalidate = 0;

export const metadata = {
  title: "Herds",
};

export default async function HerdsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [herdsResult, { data: breedPremiumData }, { data: propertiesData }] = await Promise.all([
    supabase
      .from("herd_groups")
      .select("*, properties(property_name)")
      .eq("user_id", user!.id)
      .eq("is_sold", false)
      .eq("is_deleted", false)
      .order("name"),
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

  // Fetch pricing data in a single combined query matching iOS prefetchPricesForHerds():
  // - Saleyard + "National" combined, filtered by MLA categories, all breeds
  // - Ordered by data_date DESC - no tight limit since a single saleyard can have 10k+ rows
  // - Expiry filter: only include non-expired entries (matches iOS expiryFilter)
  const saleyards = [...new Set((herds ?? []).map((h) => h.selected_saleyard ? resolveMLASaleyardName(h.selected_saleyard) : null).filter(Boolean))] as string[];
  const mlaCategories = [...new Set((herds ?? []).map((h) => mapCategoryToMLACategory(h.category)))];
  const saleyardsToFetch = [...saleyards, "National"];

  const { data: allPrices } = mlaCategories.length > 0
    ? await supabase
        .from("category_prices")
        .select("category, price_per_kg:final_price_per_kg, weight_range, saleyard, breed, data_date")
        .in("saleyard", saleyardsToFetch)
        .in("category", mlaCategories)
        .order("data_date", { ascending: false })
        .limit(50000)
    : { data: [] as { category: string; price_per_kg: number; weight_range: string | null; saleyard: string; breed: string | null; data_date: string }[] };

  // Build pricing lookup maps from combined result (same keys as iOS cache)
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
  // Seed with local breed premiums, then let Supabase override (matches iOS BreedPremiumService)
  const premiumMap = new Map<string, number>(Object.entries(cattleBreedPremiums));
  for (const b of (breedPremiumData ?? [])) {
    premiumMap.set(b.breed, b.premium_percent);
  }

  // Compute per-herd valuations with price source tracking
  const herdValuesObj: Record<string, number> = {};
  const herdSourcesObj: Record<string, string> = {};
  const herdPricePerKgObj: Record<string, number> = {};
  let totalValue = 0;
  for (const h of (herds ?? [])) {
    const result = calculateHerdValuation(
      h as Parameters<typeof calculateHerdValuation>[0],
      nationalPriceMap, premiumMap, undefined, saleyardPriceMap, saleyardBreedPriceMap
    );
    herdValuesObj[h.id] = result.netValue;
    herdSourcesObj[h.id] = result.priceSource;
    herdPricePerKgObj[h.id] = result.pricePerKg;
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
    <div className="max-w-6xl">
      <PageHeader
        title="Herds"
        subtitle="Manage your livestock herds."
        actions={
          <Link href="/dashboard/herds/new">
            <Button size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
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
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div className="rounded-2xl bg-white/5 p-4 sm:p-5">
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

            <div className="rounded-2xl bg-white/5 p-4 sm:p-5">
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

            <div className="rounded-2xl bg-white/5 p-4 sm:p-5">
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

            <div className="rounded-2xl bg-white/5 p-4 sm:p-5">
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
          <HerdsTable herds={herds} herdValues={herdValuesObj} herdSources={herdSourcesObj} herdPricePerKg={herdPricePerKgObj} propertyGroups={propertyGroups} />
        </>
      )}
    </div>
  );
}
