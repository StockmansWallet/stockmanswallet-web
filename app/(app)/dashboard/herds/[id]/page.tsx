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
import { MusterRecordsSection } from "@/components/app/muster-records-section";
import { HealthRecordsSection } from "@/components/app/health-records-section";
import { Pencil, Info, Scale, Heart, MapPin, FileText, DollarSign, AlertTriangle, BarChart3, Clock } from "lucide-react";

export const revalidate = 0;

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

  // Fetch herd + breed premiums + records in parallel
  const [herdResult, { data: breedPremiumData }, { data: musterRecords }, { data: healthRecords }] = await Promise.all([
    supabase
      .from("herd_groups")
      .select("*, properties(property_name)")
      .eq("id", id)
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .single(),
    supabase
      .from("breed_premiums")
      .select("breed, premium_percent:premium_pct"),
    supabase
      .from("muster_records")
      .select("id, date, total_head_count, cattle_yard, weaners_count, branders_count, notes")
      .eq("herd_id", id)
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .order("date", { ascending: false }),
    supabase
      .from("health_records")
      .select("id, date, treatment_type, notes")
      .eq("herd_id", id)
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .order("date", { ascending: false }),
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

  // Fetch pricing data in a single combined query matching iOS prefetchPricesForHerds():
  // - Saleyard + "National" combined, filtered by MLA category, all breeds
  // - Ordered by data_date DESC - no tight limit since a single saleyard can have 10k+ rows
  // - Expiry filter: only include non-expired entries (matches iOS expiryFilter)
  const mlaCategory = mapCategoryToMLACategory(herd.category);
  const resolvedSaleyard = herd.selected_saleyard
    ? resolveMLASaleyardName(herd.selected_saleyard)
    : null;
  const saleyardsToFetch = resolvedSaleyard
    ? [resolvedSaleyard, "National"]
    : ["National"];

  const { data: allPrices } = await supabase
    .from("category_prices")
    .select("category, price_per_kg:final_price_per_kg, weight_range, saleyard, breed")
    .in("saleyard", saleyardsToFetch)
    .eq("category", mlaCategory)
    .order("data_date", { ascending: false })
    .limit(50000);

  // Build pricing lookup maps from combined result (same keys as iOS cache)
  const nationalPriceMap = new Map<string, CategoryPriceEntry[]>();
  let saleyardPriceMap: Map<string, CategoryPriceEntry[]> | undefined;
  let saleyardBreedPriceMap: Map<string, CategoryPriceEntry[]> | undefined;
  if (resolvedSaleyard) {
    saleyardPriceMap = new Map();
    saleyardBreedPriceMap = new Map();
  }

  for (const p of (allPrices ?? [])) {
    const priceEntry = { price_per_kg: p.price_per_kg / 100, weight_range: p.weight_range };
    if (p.saleyard === "National" && p.breed === null) {
      const entries = nationalPriceMap.get(p.category) ?? [];
      entries.push(priceEntry);
      nationalPriceMap.set(p.category, entries);
    } else if (resolvedSaleyard && p.saleyard === resolvedSaleyard) {
      if (p.breed === null) {
        const key = `${p.category}|${p.saleyard}`;
        const entries = saleyardPriceMap!.get(key) ?? [];
        entries.push(priceEntry);
        saleyardPriceMap!.set(key, entries);
      } else {
        const key = `${p.category}|${p.breed}|${p.saleyard}`;
        const entries = saleyardBreedPriceMap!.get(key) ?? [];
        entries.push(priceEntry);
        saleyardBreedPriceMap!.set(key, entries);
      }
    }
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
    <div className="max-w-6xl">
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
        <div className="mb-4 rounded-2xl bg-white/5 p-5">
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
        {/* Key Metrics - matches iOS PrimaryMetricsCard */}
        {herdValue > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <SectionIcon icon={BarChart3} />
                <CardTitle>Key Metrics</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 divide-y divide-white/[0.04]">
              <InfoRow label="Price (Per Kilogram)" value={`$${valuation.pricePerKg.toFixed(2)}/kg`} />
              <InfoRow label="Average Weight" value={`${Math.round(projectedWeight ?? herd.current_weight ?? herd.initial_weight ?? 0)} kg`} />
              <InfoRow label="Value Per Head" value={`$${Math.round(herdValue / (herd.head_count || 1)).toLocaleString()}`} />
              <InfoRow label="Saleyard" value={herd.selected_saleyard ?? "No saleyard selected"} />
            </CardContent>
          </Card>
        )}

        {/* Physical Attributes - matches iOS HerdDetailsInfoCard */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <SectionIcon icon={Info} />
              <CardTitle>Physical Attributes</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 divide-y divide-white/[0.04]">
            <InfoRow label="Herd Size" value={herd.head_count ? `${herd.head_count.toLocaleString()} head` : null} />
            <InfoRow label="Species" value={herd.species} />
            <InfoRow label="Breed" value={herd.breed} />
            <InfoRow label="Category" value={herd.category} />
            <InfoRow label="Sex" value={herd.sex} />
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

        {/* Weight Tracking - matches iOS Weight Tracking section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <SectionIcon icon={Scale} />
              <CardTitle>Weight Tracking</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 divide-y divide-white/[0.04]">
            <InfoRow label="Initial Weight" value={herd.initial_weight ? `${herd.initial_weight} kg` : null} />
            <InfoRow label="Current Weight" value={herd.current_weight ? `${herd.current_weight} kg` : null} />
            {projectedWeight && <InfoRow label="Projected Weight" value={`${Math.round(projectedWeight)} kg`} />}
            <InfoRow label="Daily Weight Gain" value={herd.daily_weight_gain ? `${herd.daily_weight_gain} kg/day` : null} />
            {herd.mortality_rate != null && herd.mortality_rate > 0 && (
              <InfoRow label="Mortality Rate" value={`${Math.round(herd.mortality_rate * 100)}% annually`} />
            )}
          </CardContent>
        </Card>

        {/* Location - matches iOS Location section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <SectionIcon icon={MapPin} />
              <CardTitle>Location</CardTitle>
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

        {/* Timeline - matches iOS Timeline section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <SectionIcon icon={Clock} />
              <CardTitle>Timeline</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 divide-y divide-white/[0.04]">
            <InfoRow label="Days Held" value={`${Math.max(0, Math.round((Date.now() - new Date(herd.created_at).getTime()) / 86400000))} days`} />
            <InfoRow label="Created" value={new Date(herd.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })} />
            <InfoRow label="Last Updated" value={new Date(herd.updated_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })} />
          </CardContent>
        </Card>

        {/* Mustering Records */}
        <MusterRecordsSection herdId={id} records={musterRecords ?? []} editable />

        {/* Health Records */}
        <HealthRecordsSection herdId={id} records={healthRecords ?? []} editable />

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
