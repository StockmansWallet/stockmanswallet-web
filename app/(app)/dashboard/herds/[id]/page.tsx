import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calculateProjectedWeight, calculateHerdValuation, mapCategoryToMLACategory, type CategoryPriceEntry } from "@/lib/engines/valuation-engine";
import { cattleBreedPremiums, resolveMLASaleyardName } from "@/lib/data/reference-data";
import { DeleteHerdButton } from "./delete-button";
import { Pencil, Info, Scale, Heart, MapPin, FileText, DollarSign, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Herd Details",
};

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-center justify-between py-3 text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium tabular-nums text-text-primary">{String(value)}</span>
    </div>
  );
}

function SectionIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
      <Icon className="h-3.5 w-3.5 text-brand" />
    </div>
  );
}

export default async function HerdDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch herd + pricing data in parallel
  const [herdResult, { data: nationalPrices }, { data: breedPremiumData }] = await Promise.all([
    supabase
      .from("herd_groups")
      .select("*, properties(property_name)")
      .eq("id", id)
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .single(),
    supabase
      .from("category_prices")
      .select("category, price_per_kg:final_price_per_kg, weight_range")
      .eq("saleyard", "National")
      .is("breed", null),
    supabase
      .from("breed_premiums")
      .select("breed, premium_percent:premium_pct"),
  ]);

  let herd = herdResult.data;
  const error = herdResult.error;

  if (error && !herd) {
    const fallback = await supabase
      .from("herd_groups")
      .select("*")
      .eq("id", id)
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .single();
    herd = fallback.data ? { ...fallback.data, properties: null } : null;
  }

  if (!herd) notFound();

  // Fetch saleyard-specific prices if herd has a selected saleyard
  // No breed filter - MLA saleyard data is mostly breed-specific (breed IS NOT NULL).
  // Filter by mapped MLA category to stay under PostgREST's 1000-row default limit.
  let saleyardPriceMap: Map<string, CategoryPriceEntry[]> | undefined;
  let saleyardBreedPriceMap: Map<string, CategoryPriceEntry[]> | undefined;
  if (herd.selected_saleyard) {
    const mlaCategory = mapCategoryToMLACategory(herd.category);
    const resolvedSaleyard = resolveMLASaleyardName(herd.selected_saleyard);
    const { data: saleyardPrices } = await supabase
      .from("category_prices")
      .select("category, price_per_kg:final_price_per_kg, weight_range, saleyard, breed")
      .eq("saleyard", resolvedSaleyard)
      .eq("category", mlaCategory);
    if (saleyardPrices && saleyardPrices.length > 0) {
      saleyardPriceMap = new Map();
      saleyardBreedPriceMap = new Map();
      for (const p of saleyardPrices) {
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
    }
  }

  // Build pricing lookup maps
  const nationalPriceMap = new Map<string, CategoryPriceEntry[]>();
  for (const p of (nationalPrices ?? [])) {
    const entries = nationalPriceMap.get(p.category) ?? [];
    entries.push({ price_per_kg: p.price_per_kg / 100, weight_range: p.weight_range });
    nationalPriceMap.set(p.category, entries);
  }
  // Seed with local breed premiums, then let Supabase override (matches iOS BreedPremiumService)
  const premiumMap = new Map<string, number>(Object.entries(cattleBreedPremiums));
  for (const b of (breedPremiumData ?? [])) {
    premiumMap.set(b.breed, b.premium_percent);
  }

  // Calculate herd value with price source tracking
  const valuation = calculateHerdValuation(
    herd as Parameters<typeof calculateHerdValuation>[0],
    nationalPriceMap,
    premiumMap,
    undefined,
    saleyardPriceMap,
    saleyardBreedPriceMap,
  );
  const herdValue = valuation.netValue;
  const isFallback = valuation.priceSource !== "saleyard";

  let projectedWeight: number | null = null;
  if (herd.initial_weight > 0 && herd.daily_weight_gain > 0) {
    const created = new Date(herd.created_at);
    const now = new Date();
    projectedWeight = calculateProjectedWeight(
      herd.initial_weight,
      created,
      herd.dwg_change_date ? new Date(herd.dwg_change_date) : now,
      now,
      herd.previous_dwg ?? herd.daily_weight_gain,
      herd.daily_weight_gain
    );
  }

  const property = herd.properties as { property_name: string } | null;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={herd.name}
        subtitle={[herd.species, herd.breed, herd.category].filter(Boolean).join(" \u00B7 ")}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/herds/${id}/edit`}>
              <Button variant="secondary" size="sm">
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
            </Link>
            <DeleteHerdButton id={id} name={herd.name} />
          </div>
        }
      />

      {/* Herd Value */}
      {herdValue > 0 && (
        <div className="mb-4 rounded-2xl bg-white/5 p-5 ring-1 ring-inset ring-white/8">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isFallback ? "bg-red-500/15" : "bg-brand/15"}`}>
              {isFallback
                ? <AlertTriangle className="h-5 w-5 text-red-400" />
                : <DollarSign className="h-5 w-5 text-brand" />
              }
            </div>
            <div>
              <p className="text-xs font-medium text-text-muted">Estimated Herd Value</p>
              <p className={`mt-0.5 text-2xl font-bold tabular-nums ${isFallback ? "text-red-400" : "text-text-primary"}`}>
                ${Math.round(herdValue).toLocaleString()}
              </p>
              <div className="flex items-center gap-2">
                {(herd.head_count ?? 0) > 0 && (
                  <p className={`text-xs ${isFallback ? "text-red-400/70" : "text-text-muted"}`}>
                    ${Math.round(herdValue / herd.head_count).toLocaleString()} per head
                  </p>
                )}
                {isFallback && (
                  <span className="inline-flex items-center rounded-md bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                    {valuation.priceSource === "national" ? "National Avg" : "Est. Fallback"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <SectionIcon icon={Info} />
              <CardTitle>Overview</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 divide-y divide-white/[0.04]">
            <InfoRow label="Species" value={herd.species} />
            <InfoRow label="Breed" value={herd.breed} />
            <InfoRow label="Sex" value={herd.sex} />
            <InfoRow label="Category" value={herd.category} />
            <InfoRow label="Head Count" value={herd.head_count?.toLocaleString()} />
            <InfoRow label="Age" value={herd.age_months ? `${herd.age_months} months` : null} />
            <InfoRow label="Animal ID" value={herd.animal_id_number} />
            {herd.is_sold && (
              <div className="flex items-center justify-between py-3 text-sm">
                <span className="text-text-muted">Status</span>
                <Badge variant="danger">Sold</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weight & Growth */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <SectionIcon icon={Scale} />
              <CardTitle>Weight & Growth</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 divide-y divide-white/[0.04]">
            <InfoRow label="Initial Weight" value={herd.initial_weight ? `${herd.initial_weight} kg` : null} />
            <InfoRow label="Current Weight" value={herd.current_weight ? `${herd.current_weight} kg` : null} />
            {projectedWeight && <InfoRow label="Projected Weight" value={`${Math.round(projectedWeight)} kg`} />}
            <InfoRow label="Daily Weight Gain" value={herd.daily_weight_gain ? `${herd.daily_weight_gain} kg/day` : null} />
          </CardContent>
        </Card>

        {/* Breeding */}
        {herd.is_breeder && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <SectionIcon icon={Heart} />
                <CardTitle>Breeding</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 divide-y divide-white/[0.04]">
              <div className="flex items-center justify-between py-3 text-sm">
                <span className="text-text-muted">Pregnant</span>
                <Badge variant={herd.is_pregnant ? "success" : "default"}>{herd.is_pregnant ? "Yes" : "No"}</Badge>
              </div>
              <InfoRow label="Joined Date" value={herd.joined_date} />
              <InfoRow label="Calving Rate" value={herd.calving_rate ? `${herd.calving_rate}%` : null} />
              <InfoRow label="Lactation Status" value={herd.lactation_status} />
              <InfoRow label="Breeding Program" value={herd.breeding_program_type} />
            </CardContent>
          </Card>
        )}

        {/* Location & Market */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <SectionIcon icon={MapPin} />
              <CardTitle>Location & Market</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 divide-y divide-white/[0.04]">
            {property && (
              <div className="flex items-center justify-between py-3 text-sm">
                <span className="text-text-muted">Property</span>
                <Link href={`/dashboard/properties/${herd.property_id}`} className="font-medium text-brand hover:underline">
                  {property.property_name}
                </Link>
              </div>
            )}
            <InfoRow label="Paddock" value={herd.paddock_name} />
            <InfoRow label="Saleyard" value={herd.selected_saleyard} />
            <InfoRow label="Market Category" value={herd.market_category} />
          </CardContent>
        </Card>

        {/* Notes */}
        {herd.notes && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <SectionIcon icon={FileText} />
                <CardTitle>Notes</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">{herd.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
