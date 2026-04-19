import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isAdvisorRole } from "@/lib/types/advisory";
import type { HerdGroup } from "@/lib/types/models";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SimulatorContent } from "@/components/app/simulator/simulator-content";
import { ensureSandboxProperty } from "./actions";
import { calculateHerdValuation, categoryFallback, type CategoryPriceEntry } from "@/lib/engines/valuation-engine";
import { resolveMLACategory } from "@/lib/data/weight-mapping";
import { cattleBreedPremiums, resolveMLASaleyardName } from "@/lib/data/reference-data";
import { expandWithNearbySaleyards } from "@/lib/data/saleyard-proximity";
import { centsToDollars } from "@/lib/types/money";
import { Plus, Tags, Layers, Scale, FlaskConical, DollarSign } from "lucide-react";

export const revalidate = 0;
export const metadata = { title: "Livestock Simulator" };

export default async function SimulatorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile?.role || !isAdvisorRole(profile.role)) {
    redirect("/dashboard");
  }

  const result = await ensureSandboxProperty();
  if ("error" in result) {
    return (
      <div>
        <PageHeader
          title="Livestock Simulator"
          subtitle="Sandbox environment for what-if scenarios"
          titleClassName="text-4xl font-bold text-red"
        />
        <p className="text-sm text-error">
          Failed to load simulator: {result.error}
        </p>
      </div>
    );
  }

  const [{ data: herds }, { data: breedPremiumData }] = await Promise.all([
    supabase
      .from("herds")
      .select("*")
      .eq("property_id", result.propertyId)
      .eq("is_deleted", false)
      .order("name"),
    supabase
      .from("breed_premiums")
      .select("breed, premium_percent:premium_pct"),
  ]);

  const sandboxHerds = (herds ?? []) as HerdGroup[];

  // Fetch pricing data for valuations (same pattern as producer herds page)
  const herdSaleyards = [...new Set(sandboxHerds.map((h) => h.selected_saleyard ? resolveMLASaleyardName(h.selected_saleyard) : null).filter(Boolean))] as string[];
  const saleyards = expandWithNearbySaleyards(herdSaleyards);
  const primaryCategories = [...new Set(sandboxHerds.map((h) => resolveMLACategory(h.category, h.initial_weight, h.breeder_sub_type ?? undefined).primaryMLACategory))];
  const mlaCategories = [...new Set([...primaryCategories, ...primaryCategories.map(c => categoryFallback(c)).filter((c): c is string => c !== null)])];

  type PriceRow = { category: string; price_per_kg: number; weight_range: string | null; saleyard: string; breed: string | null; data_date: string };
  const emptyPrices: PriceRow[] = [];
  const { data: allPrices } = mlaCategories.length > 0
    ? await supabase.rpc("latest_saleyard_prices", { p_saleyards: saleyards, p_categories: mlaCategories }) as { data: PriceRow[] | null }
    : { data: emptyPrices };

  const nationalPriceMap = new Map<string, CategoryPriceEntry[]>();
  const saleyardPriceMap = new Map<string, CategoryPriceEntry[]>();
  const saleyardBreedPriceMap = new Map<string, CategoryPriceEntry[]>();
  for (const p of (allPrices ?? [])) {
    const priceEntry = { price_per_kg: centsToDollars(p.price_per_kg), weight_range: p.weight_range, data_date: p.data_date };
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

  // Compute per-herd valuations (same data as producer herds page)
  const herdValues: Record<string, number> = {};
  const herdSources: Record<string, string> = {};
  const herdPricePerKg: Record<string, number> = {};
  const herdBreedingAccrual: Record<string, number> = {};
  const herdNearestSaleyard: Record<string, string | null> = {};
  const herdProjectedWeight: Record<string, number> = {};
  const herdBreedPremium: Record<string, number> = {};
  let totalValue = 0;
  for (const h of sandboxHerds) {
    const val = calculateHerdValuation(
      h as Parameters<typeof calculateHerdValuation>[0],
      nationalPriceMap, premiumMap, undefined, saleyardPriceMap, saleyardBreedPriceMap
    );
    herdValues[h.id] = val.netValue;
    herdSources[h.id] = val.priceSource;
    herdPricePerKg[h.id] = val.pricePerKg;
    herdBreedingAccrual[h.id] = val.breedingAccrual;
    herdNearestSaleyard[h.id] = val.nearestSaleyardUsed;
    herdProjectedWeight[h.id] = val.projectedWeight;
    herdBreedPremium[h.id] = val.breedPremiumApplied;
    totalValue += val.netValue;
  }

  const totalHead = sandboxHerds.reduce((sum, h) => sum + h.head_count, 0);
  const avgWeight = sandboxHerds.length > 0
    ? Math.round(sandboxHerds.reduce((sum, h) => sum + (h.current_weight ?? 0), 0) / (sandboxHerds.filter((h) => h.current_weight > 0).length || 1))
    : 0;

  return (
    <div className="max-w-[1800px]">
      <PageHeader
        title="Livestock Simulator"
        titleClassName="text-4xl font-bold text-red"
        subtitle="Sandbox environment for what-if scenarios"
        actions={
          sandboxHerds.length > 0 ? (
            <Link href="/dashboard/advisor/simulator/new">
              <Button size="md" variant="simulator">
                <Plus className="mr-1.5 h-4 w-4" />
                Add Herd
              </Button>
            </Link>
          ) : undefined
        }
      />

      {sandboxHerds.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FlaskConical className="h-6 w-6 text-red" />}
            title="No herds yet"
            description="Add a herd to start modelling scenarios. Changes here do not affect real client data."
            actionLabel="Add Herd"
            actionHref="/dashboard/advisor/simulator/new"
          />
        </Card>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <StatCard icon={<DollarSign className="h-4 w-4" />} label="Total Value" value={`$${Math.round(totalValue).toLocaleString()}`} accent="simulator" />
            <StatCard icon={<Tags className="h-4 w-4" />} label="Total Head" value={totalHead.toLocaleString()} accent="simulator" />
            <StatCard icon={<Layers className="h-4 w-4" />} label="Herds" value={String(sandboxHerds.length)} accent="simulator" />
            <StatCard icon={<Scale className="h-4 w-4" />} label="Avg Weight" value={avgWeight > 0 ? `${avgWeight} kg` : "\u2014"} accent="simulator" />
          </div>

          <SimulatorContent
            herds={sandboxHerds}
            herdValues={herdValues}
            herdPricePerKg={herdPricePerKg}
            herdSources={herdSources}
            herdNearestSaleyard={herdNearestSaleyard}
            herdProjectedWeight={herdProjectedWeight}
            herdBreedPremium={herdBreedPremium}
            herdBreedingAccrual={herdBreedingAccrual}
          />
        </>
      )}
    </div>
  );
}
