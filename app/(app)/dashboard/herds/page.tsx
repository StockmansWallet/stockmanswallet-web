import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { HerdsTable } from "./herds-table";
import { Plus, Tags, Layers, DollarSign, Scale, Archive } from "lucide-react";
import { calculateHerdValuation, categoryFallback, type CategoryPriceEntry } from "@/lib/engines/valuation-engine";
import { resolveMLACategory } from "@/lib/data/weight-mapping";
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
      .from("herds")
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
      .from("herds")
      .select("*")
      .eq("user_id", user!.id)
      .eq("is_sold", false)
      .eq("is_deleted", false)
      .order("name");
    herds = fallback.data?.map((h) => ({ ...h, properties: null })) ?? null;
  }

  // Fetch only the newest date's prices per saleyard+category via RPC.
  // This avoids the 50k PostgREST row limit that silently truncates multi-saleyard queries
  // when full history is fetched, causing inconsistent valuations across pages.
  const saleyards = [...new Set((herds ?? []).map((h) => h.selected_saleyard ? resolveMLASaleyardName(h.selected_saleyard) : null).filter(Boolean))] as string[];
  const primaryCategories = [...new Set((herds ?? []).map((h) => resolveMLACategory(h.category, h.initial_weight, h.breeder_sub_type ?? undefined).primaryMLACategory))];
  const mlaCategories = [...new Set([...primaryCategories, ...primaryCategories.map(c => categoryFallback(c)).filter((c): c is string => c !== null)])];

  type PriceRow = { category: string; price_per_kg: number; weight_range: string | null; saleyard: string; breed: string | null; data_date: string };
  const emptyPrices: PriceRow[] = [];

  const { data: allPrices } = mlaCategories.length > 0
    ? await supabase.rpc("latest_saleyard_prices", {
        p_saleyards: saleyards,
        p_categories: mlaCategories,
      }) as { data: PriceRow[] | null }
    : { data: emptyPrices };

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
        titleClassName="text-4xl font-bold text-brand"
        subtitle="Manage your livestock herds."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/herds/sold">
              <Button variant="secondary" size="md">
                <Archive className="mr-1.5 h-4 w-4" />
                Sold Herds
              </Button>
            </Link>
            <Link href="/dashboard/herds/new">
              <Button size="md">
                <Plus className="mr-1.5 h-4 w-4" />
                Add Herd
              </Button>
            </Link>
          </div>
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
            <StatCard icon={<DollarSign className="h-4 w-4" />} label="Total Value" value={`$${Math.round(totalValue).toLocaleString()}`} />
            <StatCard icon={<Tags className="h-4 w-4" />} label="Total Head" value={totalHead.toLocaleString()} />
            <StatCard icon={<Layers className="h-4 w-4" />} label="Herds" value={String(herds.length)} />
            <StatCard icon={<Scale className="h-4 w-4" />} label="Avg Weight" value={avgWeight > 0 ? `${avgWeight} kg` : "\u2014"} />
          </div>

          {/* Table */}
          <HerdsTable
            herds={herds}
            herdValues={herdValuesObj}
            herdSources={herdSourcesObj}
            herdPricePerKg={herdPricePerKgObj}
            propertyGroups={propertyGroups}
          />
        </>
      )}
    </div>
  );
}
