import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdvisorRole } from "@/lib/types/advisory";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calculateProjectedWeight, calculateHerdValuation, categoryFallback, parseCalvesAtFoot, type CategoryPriceEntry } from "@/lib/engines/valuation-engine";
import { resolveMLACategory } from "@/lib/data/weight-mapping";
import { cattleBreedPremiums, resolveMLASaleyardName } from "@/lib/data/reference-data";
import { expandWithNearbySaleyards } from "@/lib/data/saleyard-proximity";
import { getEffectiveJoinedDate } from "@/lib/data/breeding";
import { Pencil, Info, Scale, Heart, MapPin, DollarSign, AlertTriangle, BarChart3, Clock, FlaskConical } from "lucide-react";
import { SimulatorDeleteHerdButton } from "./delete-button";

export const revalidate = 0;
export const metadata = { title: "Sandbox Herd Details" };

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
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#ff4021]/15">
      <Icon className="h-3.5 w-3.5 text-[#ff4021]" />
    </div>
  );
}

export default async function SimulatorHerdDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile?.role || !isAdvisorRole(profile.role)) redirect("/dashboard");

  // Fetch herd + breed premiums in parallel
  const [herdResult, { data: breedPremiumData }] = await Promise.all([
    supabase
      .from("herds")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .single(),
    supabase
      .from("breed_premiums")
      .select("breed, premium_percent:premium_pct"),
  ]);

  const herd = herdResult.data;
  if (!herd) notFound();

  // Verify this is a sandbox herd
  const { data: prop } = await supabase
    .from("properties")
    .select("is_simulated")
    .eq("id", herd.property_id)
    .single();
  if (!prop?.is_simulated) notFound();

  // Fetch pricing data
  const mlaCategory = resolveMLACategory(herd.category, herd.initial_weight, herd.breeder_sub_type ?? undefined).primaryMLACategory;
  const fallbackCat = categoryFallback(mlaCategory);
  const categoriesToFetch = fallbackCat ? [mlaCategory, fallbackCat] : [mlaCategory];
  const resolvedSaleyard = herd.selected_saleyard ? resolveMLASaleyardName(herd.selected_saleyard) : null;
  const saleyardsToFetch = resolvedSaleyard ? expandWithNearbySaleyards([resolvedSaleyard]) : [];

  type PriceRow = { category: string; price_per_kg: number; weight_range: string | null; saleyard: string; breed: string | null; data_date: string };
  const { data: allPrices } = await supabase.rpc("latest_saleyard_prices", {
    p_saleyards: saleyardsToFetch,
    p_categories: categoriesToFetch,
  }) as unknown as { data: PriceRow[] | null };

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
  const dataAgeDays = valuation.dataDate
    ? Math.floor((Date.now() - new Date(valuation.dataDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const isStale = dataAgeDays > 42 && !isFallback;
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

  const calvesData = parseCalvesAtFoot(herd.additional_info);
  const calvesAtFootValue = valuation.calvesAtFootValue;
  const unbornProgenyValue = valuation.preBirthAccrual;
  const birthWeightRatio = herd.species === "Cattle" ? 0.07 : 0.08;
  const estimatedCalfBirthValue = valuation.pricePerKg > 0
    ? (projectedWeight ?? herd.current_weight ?? herd.initial_weight ?? 0) * birthWeightRatio * valuation.pricePerKg
    : null;

  const effectiveJoinedDateObj = getEffectiveJoinedDate(herd);
  const hasJoiningStarted = effectiveJoinedDateObj ? effectiveJoinedDateObj <= new Date() : false;
  const breedingCycleDays = 365;
  const daysSinceJoined = hasJoiningStarted && effectiveJoinedDateObj
    ? Math.max(0, Math.round((Date.now() - effectiveJoinedDateObj.getTime()) / 86400000))
    : 0;
  const daysUntilJoining = !hasJoiningStarted && effectiveJoinedDateObj
    ? Math.max(0, Math.round((effectiveJoinedDateObj.getTime() - Date.now()) / 86400000))
    : 0;
  const daysUntilCalving = hasJoiningStarted ? Math.max(0, breedingCycleDays - daysSinceJoined) : 0;
  const gestationProgress = hasJoiningStarted ? Math.min(100, Math.max(0, (daysSinceJoined / breedingCycleDays) * 100)) : 0;

  const categoryDisplay = herd.sub_category && herd.sub_category !== herd.category
    ? `${herd.category} (${herd.sub_category})`
    : herd.category;

  return (
    <div className="max-w-6xl">
      <PageHeader
        title={herd.name}
        subtitle={[herd.species, herd.breed, categoryDisplay].filter(Boolean).join(" \u00B7 ")}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/advisor/simulator/herd/${id}/edit`}>
              <Button variant="secondary" size="sm">
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
            </Link>
            <SimulatorDeleteHerdButton id={id} name={herd.name} />
          </div>
        }
      />

      {/* Sandbox badge */}
      <div className="mb-4 flex items-center gap-2">
        <FlaskConical className="h-4 w-4 text-[#ff4021]" />
        <span className="text-xs font-medium text-text-muted">Sandbox herd. Changes do not affect real data.</span>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Left column */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Herd Value */}
          {herdValue > 0 && (
            <div className="rounded-2xl bg-white/5 p-5">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isFallback ? "bg-red-500/15" : isStale ? "bg-amber-500/15" : "bg-[#ff4021]/15"}`}>
                  {isFallback ? <AlertTriangle className="h-5 w-5 text-red-400" /> : isStale ? <Clock className="h-5 w-5 text-amber-400" /> : <DollarSign className="h-5 w-5 text-[#ff4021]" />}
                </div>
                <div>
                  <p className="text-xs font-medium text-text-muted">Estimated Herd Value</p>
                  <p className={`mt-0.5 text-2xl font-bold tabular-nums ${isFallback ? "text-red-400" : isStale ? "text-amber-400" : "text-text-primary"}`}>
                    ${Math.round(herdValue).toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2">
                    {(herd.head_count ?? 0) > 0 && (
                      <p className={`text-xs ${isFallback ? "text-red-400/70" : isStale ? "text-amber-400/70" : "text-text-muted"}`}>
                        ${Math.round(herdValue / herd.head_count).toLocaleString()} per head
                      </p>
                    )}
                    {isFallback && <span className="inline-flex items-center rounded-md bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-400">{valuation.priceSource === "national" ? "National Avg" : "Est. Fallback"}</span>}
                    {isStale && <span className="inline-flex items-center rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">Stale - {staleWeeks}w</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Key Metrics */}
          {herdValue > 0 && (
            <Card>
              <CardHeader><div className="flex items-center gap-2.5"><SectionIcon icon={BarChart3} /><CardTitle>Key Metrics</CardTitle></div></CardHeader>
              <CardContent className="px-5 pb-5 divide-y divide-white/[0.04]">
                <InfoRow label="Price (Per Kilogram)" value={`$${valuation.pricePerKg.toFixed(2)}/kg`} valueClassName={isFallback ? "text-red-400" : isStale ? "text-amber-400" : undefined} />
                <InfoRow label="Average Weight" value={`${Math.round(projectedWeight ?? herd.current_weight ?? herd.initial_weight ?? 0)} kg`} />
                <InfoRow label="Value Per Head" value={`$${Math.round(herdValue / (herd.head_count || 1)).toLocaleString()}`} />
              </CardContent>
            </Card>
          )}

          {/* Weight Tracking */}
          <Card>
            <CardHeader><div className="flex items-center gap-2.5"><SectionIcon icon={Scale} /><CardTitle>Weight Tracking</CardTitle></div></CardHeader>
            <CardContent className="px-5 pb-5 divide-y divide-white/[0.04]">
              <InfoRow label="Initial Weight" value={herd.initial_weight ? `${herd.initial_weight} kg` : null} />
              <InfoRow label="Current Weight" value={herd.current_weight ? `${herd.current_weight} kg` : null} />
              {projectedWeight && <InfoRow label="Projected Weight" value={`${Math.round(projectedWeight)} kg`} />}
              <InfoRow label="Daily Weight Gain" value={herd.daily_weight_gain ? `${herd.daily_weight_gain} kg/day` : null} />
              {herd.mortality_rate != null && herd.mortality_rate > 0 && <InfoRow label="Mortality Rate" value={`${Math.round(herd.mortality_rate * 100)}% annually`} />}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader><div className="flex items-center gap-2.5"><SectionIcon icon={Clock} /><CardTitle>Timeline</CardTitle></div></CardHeader>
            <CardContent className="px-5 pb-5 divide-y divide-white/[0.04]">
              <InfoRow label="Days Held" value={`${Math.max(0, Math.round((Date.now() - new Date(herd.created_at).getTime()) / 86400000))} days`} />
              <InfoRow label="Created" value={new Date(herd.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })} />
              <InfoRow label="Last Updated" value={new Date(herd.updated_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })} />
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Location */}
          <Card>
            <CardHeader><div className="flex items-center gap-2.5"><SectionIcon icon={MapPin} /><CardTitle>Location</CardTitle></div></CardHeader>
            <CardContent className="px-5 pb-5 divide-y divide-white/[0.04]">
              <InfoRow label="Paddock" value={herd.paddock_name} />
              <InfoRow label="Saleyard" value={herd.selected_saleyard} />
            </CardContent>
          </Card>

          {/* Physical Attributes */}
          <Card>
            <CardHeader><div className="flex items-center gap-2.5"><SectionIcon icon={Info} /><CardTitle>Physical Attributes</CardTitle></div></CardHeader>
            <CardContent className="px-5 pb-5 divide-y divide-white/[0.04]">
              <InfoRow label="Herd Size" value={herd.head_count ? `${herd.head_count.toLocaleString()} head` : null} />
              <InfoRow label="Species" value={herd.species} />
              <InfoRow label="Breed" value={herd.breed} />
              <InfoRow label="Category" value={categoryDisplay} />
              <InfoRow label="Age" value={herd.age_months ? `${herd.age_months} months` : null} />
              <InfoRow label="Breed Premium" value={valuation.breedPremiumApplied !== 0 ? `${valuation.breedPremiumApplied > 0 ? "+" : ""}${valuation.breedPremiumApplied}%` : null} />
            </CardContent>
          </Card>

          {/* Breeding */}
          {herd.is_breeder && (
            <Card>
              <CardHeader><div className="flex items-center gap-2.5"><SectionIcon icon={Heart} /><CardTitle>Breeding</CardTitle></div></CardHeader>
              <CardContent className="px-5 pb-5 divide-y divide-white/[0.04]">
                <div className="flex items-center justify-between py-3 text-sm">
                  <span className="text-text-muted">Pregnant</span>
                  <Badge variant={herd.is_pregnant ? "success" : "default"}>{herd.is_pregnant ? "Yes" : "No"}</Badge>
                </div>
                <InfoRow label="Breeding Program" value={herd.breeding_program_type ? herd.breeding_program_type.charAt(0).toUpperCase() + herd.breeding_program_type.slice(1) : null} />
                {herd.joining_period_start && <InfoRow label={herd.breeding_program_type === "ai" ? "Insemination Started" : "Put Bulls In"} value={new Date(herd.joining_period_start).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })} />}
                {herd.joining_period_end && <InfoRow label={herd.breeding_program_type === "ai" ? "Insemination Complete" : "Pull Bulls Out"} value={new Date(herd.joining_period_end).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })} />}
                {effectiveJoinedDateObj && (herd.breeding_program_type === "ai" || herd.breeding_program_type === "controlled") && <InfoRow label="Effective Joining Date" value={effectiveJoinedDateObj.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })} />}
                {effectiveJoinedDateObj && hasJoiningStarted && <InfoRow label="Days Since Joining" value={`${daysSinceJoined} days`} />}
                {effectiveJoinedDateObj && !hasJoiningStarted && daysUntilJoining > 0 && <InfoRow label="Days Until Joining" value={`${daysUntilJoining} days`} />}
                {effectiveJoinedDateObj && <InfoRow label="Expected Calving" value={new Date(effectiveJoinedDateObj.getTime() + breedingCycleDays * 86400000).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })} />}
                {effectiveJoinedDateObj && hasJoiningStarted && herd.is_pregnant && daysUntilCalving > 0 && <InfoRow label="Est. Days to Calving" value={`${daysUntilCalving} days`} />}
                {effectiveJoinedDateObj && hasJoiningStarted && gestationProgress > 5 && gestationProgress < 100 && <InfoRow label="Gestation Progress" value={`${Math.round(gestationProgress)}%`} />}
                <InfoRow label="Calving Rate" value={herd.calving_rate ? `${Math.round(herd.calving_rate > 1 ? herd.calving_rate : herd.calving_rate * 100)}%` : null} />
                <InfoRow label="Lactation Status" value={herd.lactation_status} />
                {calvesData && <InfoRow label="Calves at Foot" value={`${calvesData.headCount} head, ${calvesData.ageMonths} months${calvesData.averageWeight ? `, ${Math.round(calvesData.averageWeight)} kg` : ""}`} />}
              </CardContent>

              {/* Calf Value Breakdown */}
              {valuation.breedingAccrual > 0 && (
                <CardContent className="px-5 pb-5 pt-0">
                  <div className="border-t border-white/[0.04] pt-3">
                    <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-muted">Calf Value Breakdown</p>
                    <div className="divide-y divide-white/[0.04]">
                      {estimatedCalfBirthValue != null && estimatedCalfBirthValue > 0 && <InfoRow label="Est. Value Per Calf" value={`$${Math.round(estimatedCalfBirthValue).toLocaleString()}`} />}
                      {unbornProgenyValue > 0 && <InfoRow label="Unborn Progeny (Accruing)" value={`$${Math.round(unbornProgenyValue).toLocaleString()}`} />}
                      {calvesData && calvesAtFootValue > 0 && <InfoRow label={`Calves at Foot (${calvesData.headCount} head)`} value={`$${Math.round(calvesAtFootValue).toLocaleString()}`} />}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Notes */}
      {herd.notes && (
        <Card className="mt-4">
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">{herd.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
