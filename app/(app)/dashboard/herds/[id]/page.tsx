import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { YardBookBanner } from "@/components/app/yard-book-banner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { calculateProjectedWeight, calculateHerdValuation, categoryFallback, parseCalvesAtFoot, type CategoryPriceEntry } from "@/lib/engines/valuation-engine";
import { resolveMLACategory } from "@/lib/data/weight-mapping";
import { cattleBreedPremiums, resolveMLASaleyardName } from "@/lib/data/reference-data";
import { expandWithNearbySaleyards } from "@/lib/data/saleyard-proximity";
import { getEffectiveJoinedDate } from "@/lib/data/breeding";
import { DeleteHerdButton } from "./delete-button";
import { MusterRecordsSection } from "@/components/app/muster-records-section";
import { HealthRecordsSection } from "@/components/app/health-records-section";
import { Info, Scale, Heart, MapPin, FileText, Clock } from "lucide-react";

export const revalidate = 0;

export const metadata = {
  title: "Herd Details",
};

function InfoRow({ label, value, valueClassName }: { label: string; value: string | number | null | undefined; valueClassName?: string }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-center justify-between py-3 text-sm">
      <span className="text-text-muted">{label}</span>
      <span className={`font-medium tabular-nums ${valueClassName ?? "text-text-primary"}`}>{String(value)}</span>
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
      .from("herds")
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
      .from("herds")
      .select("*")
      .eq("id", id)
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .single();
    herd = fallback.data ? { ...fallback.data, properties: null } : null;
  }

  if (!herd) notFound();

  // Fetch only the newest date's prices per saleyard+category via RPC
  const mlaCategory = resolveMLACategory(herd.category, herd.initial_weight, herd.breeder_sub_type ?? undefined).primaryMLACategory;
  const fallbackCat = categoryFallback(mlaCategory);
  const categoriesToFetch = fallbackCat ? [mlaCategory, fallbackCat] : [mlaCategory];
  const resolvedSaleyard = herd.selected_saleyard
    ? resolveMLASaleyardName(herd.selected_saleyard)
    : null;
  const saleyardsToFetch = resolvedSaleyard ? expandWithNearbySaleyards([resolvedSaleyard]) : [];

  type PriceRow = { category: string; price_per_kg: number; weight_range: string | null; saleyard: string; breed: string | null; data_date: string };
  const { data: allPrices } = await supabase.rpc("latest_saleyard_prices", {
    p_saleyards: saleyardsToFetch,
    p_categories: categoriesToFetch,
  }) as unknown as { data: PriceRow[] | null };

  // Build pricing lookup maps from combined result (includes nearby saleyards for fallback)
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

  // Debug: Stale data warning (6-8 weeks old) — amber indicators
  const dataAgeDays = valuation.dataDate
    ? Math.floor((Date.now() - new Date(valuation.dataDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const isStale = dataAgeDays > 42 && !isFallback; // 6 weeks warning threshold
  const staleWeeks = Math.floor(dataAgeDays / 7);

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

  // Calves at foot breakdown (for Breeding card display)
  const calvesData = parseCalvesAtFoot(herd.additional_info);
  const calvesAtFootValue = valuation.calvesAtFootValue;
  const unbornProgenyValue = valuation.preBirthAccrual;
  const birthWeightRatio = herd.species === "Cattle" ? 0.07 : 0.08;
  const estimatedCalfBirthValue = valuation.pricePerKg > 0
    ? (projectedWeight ?? herd.current_weight ?? herd.initial_weight ?? 0) * birthWeightRatio * valuation.pricePerKg
    : null;

  // Breeding countdown logic (matches iOS Herd.effectiveJoinedDate)
  const effectiveJoinedDateObj = getEffectiveJoinedDate(herd);
  const hasJoiningStarted = effectiveJoinedDateObj ? effectiveJoinedDateObj <= new Date() : false;
  const breedingCycleDays = 365;
  const daysSinceJoined = hasJoiningStarted && effectiveJoinedDateObj
    ? Math.max(0, Math.round((Date.now() - effectiveJoinedDateObj.getTime()) / 86400000))
    : 0;
  const daysUntilJoining = !hasJoiningStarted && effectiveJoinedDateObj
    ? Math.max(0, Math.round((effectiveJoinedDateObj.getTime() - Date.now()) / 86400000))
    : 0;
  const daysUntilCalving = hasJoiningStarted
    ? Math.max(0, breedingCycleDays - daysSinceJoined)
    : 0;
  const gestationProgress = hasJoiningStarted
    ? Math.min(100, Math.max(0, (daysSinceJoined / breedingCycleDays) * 100))
    : 0;

  const property = herd.properties as { property_name: string } | null;

  const categoryLabel = herd.sub_category && herd.sub_category !== herd.category
    ? `${herd.category} (${herd.sub_category})`
    : herd.category;
  const avgWeight = Math.round(projectedWeight ?? herd.current_weight ?? herd.initial_weight ?? 0);
  const valuePerHead = herd.head_count ? Math.round(herdValue / herd.head_count) : 0;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={herd.name}
        titleClassName="text-4xl font-bold text-brand"
        subtitle={[herd.species, herd.breed, categoryLabel].filter(Boolean).join(" | ")}
      />

      {/* Stats row */}
      {herdValue > 0 && (
        <div className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-5 lg:gap-4">
          <StatCard label="Herd Value" value={`$${Math.round(herdValue).toLocaleString()}`} />
          <StatCard label="$/kg" value={valuation.pricePerKg > 0 ? `$${valuation.pricePerKg.toFixed(2)}` : "\u2014"} />
          <StatCard label="Avg Weight" value={avgWeight > 0 ? `${avgWeight} kg` : "\u2014"} />
          <StatCard label="Value/Head" value={valuePerHead > 0 ? `$${valuePerHead.toLocaleString()}` : "\u2014"} />
          {herd.head_count && <StatCard label="Head Count" value={`${herd.head_count.toLocaleString()}`} />}
        </div>
      )}

      {/* Action bar */}
      <div className="mt-3 flex items-center justify-between rounded-full bg-surface-lowest px-2 py-2 lg:mt-4">
        <div className="flex items-center gap-1.5 pl-2">
          {isFallback && (
            <span className="inline-flex items-center rounded-full bg-red-500/15 px-2 py-1 text-[10px] font-medium text-red-400">
              {valuation.priceSource === "national" ? "National Avg" : "Est. Fallback"}
            </span>
          )}
          {isStale && (
            <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-medium text-amber-400">
              Stale - {staleWeeks}w
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {!herd.is_sold && (
            <Link
              href={`/dashboard/herds/${id}/sell`}
              className="inline-flex h-8 shrink-0 items-center rounded-full bg-surface-lowest px-3.5 text-xs font-medium text-text-muted transition-all hover:bg-surface-raised hover:text-text-secondary"
            >
              Sell
            </Link>
          )}
          <Link
            href={`/dashboard/herds/${id}/edit`}
            className="inline-flex h-8 shrink-0 items-center rounded-full bg-surface-lowest px-3.5 text-xs font-medium text-text-muted transition-all hover:bg-surface-raised hover:text-text-secondary"
          >
            Edit
          </Link>
          <DeleteHerdButton id={id} name={herd.name} />
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-4 lg:mt-4">
        {/* 1. Physical Attributes */}
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
            <InfoRow label="Category" value={categoryLabel} />
            <InfoRow label="Age" value={herd.age_months ? `${herd.age_months} months` : null} />
            <InfoRow label="Breed Premium" value={valuation.breedPremiumApplied !== 0 ? `${valuation.breedPremiumApplied > 0 ? "+" : ""}${valuation.breedPremiumApplied}%${herd.breed_premium_override != null ? " (custom)" : ""}` : null} />
            {herd.breed_premium_justification && (
              <InfoRow label="Premium Justification" value={herd.breed_premium_justification} />
            )}
            <InfoRow label="Animal ID" value={herd.animal_id_number} />
            {herd.is_sold && (
              <div className="flex items-center justify-between py-3 text-sm">
                <span className="text-text-muted">Status</span>
                <Badge variant="danger">Sold</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Location */}
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
            <InfoRow label="Saleyard" value={herd.selected_saleyard} />
          </CardContent>
        </Card>

        {/* 3. Weight Tracking */}
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

        {/* 4. Breeding */}
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
              <InfoRow label="Breeding Program" value={herd.breeding_program_type ? herd.breeding_program_type.charAt(0).toUpperCase() + herd.breeding_program_type.slice(1) : null} />
              {herd.joining_period_start && (
                <InfoRow
                  label={herd.breeding_program_type === "ai" ? "Insemination Started" : "Put Bulls In"}
                  value={new Date(herd.joining_period_start).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                />
              )}
              {herd.joining_period_end && (
                <InfoRow
                  label={herd.breeding_program_type === "ai" ? "Insemination Complete" : "Pull Bulls Out"}
                  value={new Date(herd.joining_period_end).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                />
              )}
              {effectiveJoinedDateObj && (herd.breeding_program_type === "ai" || herd.breeding_program_type === "controlled") && (
                <InfoRow label="Effective Joining Date" value={effectiveJoinedDateObj.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })} />
              )}
              {effectiveJoinedDateObj && hasJoiningStarted && (
                <InfoRow label="Days Since Joining" value={`${daysSinceJoined} days`} />
              )}
              {effectiveJoinedDateObj && !hasJoiningStarted && daysUntilJoining > 0 && (
                <InfoRow label="Days Until Joining" value={`${daysUntilJoining} days`} />
              )}
              {effectiveJoinedDateObj && (
                <InfoRow
                  label="Expected Calving"
                  value={new Date(effectiveJoinedDateObj.getTime() + breedingCycleDays * 86400000).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                />
              )}
              {effectiveJoinedDateObj && hasJoiningStarted && herd.is_pregnant && daysUntilCalving > 0 && (
                <InfoRow label="Est. Days to Calving" value={`${daysUntilCalving} days`} />
              )}
              {effectiveJoinedDateObj && hasJoiningStarted && gestationProgress > 5 && gestationProgress < 100 && (
                <InfoRow label="Gestation Progress" value={`${Math.round(gestationProgress)}%`} />
              )}
              <InfoRow label="Calving Rate" value={herd.calving_rate ? `${Math.round(herd.calving_rate > 1 ? herd.calving_rate : herd.calving_rate * 100)}%` : null} />
              <InfoRow label="Lactation Status" value={herd.lactation_status} />
              {calvesData && (
                <InfoRow
                  label="Calves at Foot"
                  value={`${calvesData.headCount} head, ${calvesData.ageMonths} months${calvesData.averageWeight ? `, ${Math.round(calvesData.averageWeight)} kg` : ""}`}
                />
              )}
              {estimatedCalfBirthValue != null && estimatedCalfBirthValue > 0 && (
                <InfoRow label="Est. Value Per Calf" value={`$${Math.round(estimatedCalfBirthValue).toLocaleString()}`} />
              )}
              {unbornProgenyValue > 0 && (
                <InfoRow label="Unborn Progeny (Accruing)" value={`$${Math.round(unbornProgenyValue).toLocaleString()}`} />
              )}
              {calvesData && calvesAtFootValue > 0 && (
                <InfoRow label={`Calves at Foot (${calvesData.headCount} head)`} value={`$${Math.round(calvesAtFootValue).toLocaleString()}`} />
              )}
              {valuation.breedingAccrual > 0 && (
                <div className="flex items-center justify-between py-3 text-sm">
                  <span className="font-semibold text-text-primary">Total Breeding Value</span>
                  <span className="font-semibold tabular-nums text-emerald-400">
                    ${Math.round(valuation.breedingAccrual).toLocaleString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {herd.is_breeder && (
          <Suspense>
            <YardBookBanner />
          </Suspense>
        )}

        {/* 5. Timeline */}
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

        {/* 6. Mustering Records */}
        <MusterRecordsSection herdId={id} records={musterRecords ?? []} editable />

        {/* 7. Health Records */}
        <HealthRecordsSection herdId={id} records={healthRecords ?? []} editable />

        {/* 8. Notes */}
        {herd.notes && (
          <Card>
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
