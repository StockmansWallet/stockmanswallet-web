import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { HerdsTable } from "./herds-table";
import { Plus, Tags, Layers, DollarSign, Scale } from "lucide-react";
import { calculateHerdValue, type CategoryPriceEntry } from "@/lib/engines/valuation-engine";

export const metadata = {
  title: "Herds",
};

export default async function HerdsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [herdsResult, { data: marketPrices }, { data: breedPremiumData }, { data: propertiesData }] = await Promise.all([
    supabase
      .from("herd_groups")
      .select("*, properties(property_name)")
      .eq("user_id", user!.id)
      .eq("is_sold", false)
      .eq("is_deleted", false)
      .order("name"),
    supabase
      .from("category_prices")
      .select("category, price_per_kg, weight_range")
      .is("saleyard", null)
      .is("state", null),
    supabase
      .from("breed_premiums")
      .select("breed, premium_percent"),
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

  // Build pricing lookup maps
  const priceMap = new Map<string, CategoryPriceEntry[]>();
  for (const p of (marketPrices ?? [])) {
    const entries = priceMap.get(p.category) ?? [];
    entries.push({ price_per_kg: p.price_per_kg, weight_range: p.weight_range });
    priceMap.set(p.category, entries);
  }
  const premiumMap = new Map((breedPremiumData ?? []).map((b) => [b.breed, b.premium_percent]));

  // Compute per-herd valuations
  const herdValuesObj: Record<string, number> = {};
  let totalValue = 0;
  for (const h of (herds ?? [])) {
    const value = calculateHerdValue(
      h as Parameters<typeof calculateHerdValue>[0],
      priceMap,
      premiumMap
    );
    herdValuesObj[h.id] = value;
    totalValue += value;
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
          <HerdsTable herds={herds} herdValues={herdValuesObj} propertyGroups={propertyGroups} />
        </>
      )}
    </div>
  );
}
