import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdvisorRole } from "@/lib/types/advisory";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LoadDemoDataButton } from "@/components/app/load-demo-data-button";
import { HerdComposition } from "./herd-composition";
import { OutlookCard } from "./outlook-card";
import { calculateHerdValuation, categoryFallback, parseCalvesAtFoot, type CategoryPriceEntry } from "@/lib/engines/valuation-engine";
import { resolveMLACategory } from "@/lib/data/weight-mapping";
import { cattleBreedPremiums, resolveMLASaleyardName } from "@/lib/data/reference-data";
import { expandWithNearbySaleyards } from "@/lib/data/saleyard-proximity";
import { PortfolioValueCard } from "@/components/app/portfolio-value-card";
import { ComingUpCard } from "@/components/app/coming-up-card";
import { GrowthMortalityCard } from "@/components/app/growth-mortality-card";
import { DashboardSaleyardSelector } from "@/components/app/dashboard-saleyard-selector";
import { DashboardInsights } from "@/components/app/dashboard-insights";
import { CalvingAccrualCard } from "@/components/app/calving-accrual-card";
import { MapPinned, Tags, Layers } from "lucide-react";
import { IconCattleTags } from "@/components/icons/icon-cattle-tags";
import { StatCard } from "@/components/ui/stat-card";
import { evaluateInsights } from "@/lib/stockman-iq/insight-engine";

export const revalidate = 0;

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ saleyard?: string }> }) {
  const { saleyard: saleyardOverride } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Fetch display name and role: prefer auth metadata, fall back to user_profiles
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name, role")
    .eq("user_id", user.id)
    .maybeSingle();

  // Redirect advisor users to their dashboard
  if (profile?.role && isAdvisorRole(profile.role)) {
    redirect("/dashboard/advisor");
  }

  const authFirstName = user?.user_metadata?.first_name || "";
  const displayName = authFirstName || profile?.display_name?.split(" ")[0] || "Stockman";
  const todayStr = new Date().toISOString().split("T")[0];

  const [{ data: herds }, { data: properties }, { data: breedPremiumData }, { data: upcomingItems }] = await Promise.all([
    supabase
      .from("herds")
      .select(`id, name, species, breed, category, head_count,
               initial_weight, current_weight, daily_weight_gain,
               dwg_change_date, previous_dwg, created_at,
               is_breeder, is_pregnant, joined_date, calving_rate,
               breeding_program_type, joining_period_start, joining_period_end,
               breed_premium_override, mortality_rate, is_sold, selected_saleyard,
               additional_info, calf_weight_recorded_date, updated_at,
               breeder_sub_type, sub_category, property_id`)
      .eq("user_id", user.id)
      .eq("is_sold", false)
      .eq("is_deleted", false)
      .order("name"),
    supabase
      .from("properties")
      .select("id, property_name, state, acreage, is_simulated, latitude, longitude, is_default, suburb")
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .order("property_name"),
    // Breed premiums (matches iOS BreedPremiumService)
    supabase
      .from("breed_premiums")
      .select("breed, premium_percent:premium_pct"),
    // Upcoming yard book items for Coming Up card
    supabase
      .from("yard_book_items")
      .select("id, title, event_date, category_raw")
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .eq("is_completed", false)
      .gte("event_date", todayStr)
      .order("event_date")
      .limit(5),
  ]);

  // Fetch only the newest date's prices per saleyard+category via RPC.
  // When a saleyard override is active (from the dashboard selector), fetch prices for that
  // saleyard only. Otherwise fetch for each herd's individual saleyard.
  const resolvedOverride = saleyardOverride ? resolveMLASaleyardName(saleyardOverride) : null;
  const herdSaleyards = resolvedOverride
    ? [resolvedOverride]
    : [...new Set((herds ?? []).map((h) => h.selected_saleyard ? resolveMLASaleyardName(h.selected_saleyard) : null).filter(Boolean))] as string[];
  const saleyards = expandWithNearbySaleyards(herdSaleyards);
  const primaryCategories = [...new Set((herds ?? []).map((h) => resolveMLACategory(h.category, h.initial_weight, h.breeder_sub_type ?? undefined).primaryMLACategory))];
  const mlaCategories = [...new Set([...primaryCategories, ...primaryCategories.map(c => categoryFallback(c)).filter((c): c is string => c !== null)])];

  type PriceRow = { category: string; price_per_kg: number; weight_range: string | null; saleyard: string; breed: string | null; data_date: string };
  const emptyPrices: PriceRow[] = [];

  const { data: rpcPrices } = mlaCategories.length > 0
    ? await supabase.rpc("latest_saleyard_prices", {
        p_saleyards: saleyards,
        p_categories: mlaCategories,
      }) as unknown as { data: PriceRow[] | null }
    : { data: emptyPrices };

  const allPrices = rpcPrices ?? [];

  const activeHerds = herds ?? [];
  const totalHead = activeHerds.reduce((sum, h) => sum + (h.head_count ?? 0), 0);
  const herdCount = activeHerds.length;
  const propertyCount = properties?.length ?? 0;

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

  // Portfolio value using full iOS valuation formula with price source tracking
  // When saleyard override is active, inject it into each herd so the valuation engine
  // uses the override saleyard for price resolution (matches iOS DashboardView behaviour).
  let portfolioValue = 0;
  let fallbackCount = 0;
  let totalPreBirthAccrual = 0;
  let totalCalvesAtFootValue = 0;
  for (const h of activeHerds) {
    const herdWithOverride = saleyardOverride
      ? { ...h, selected_saleyard: saleyardOverride }
      : h;
    const result = calculateHerdValuation(
      herdWithOverride as Parameters<typeof calculateHerdValuation>[0],
      nationalPriceMap, premiumMap, undefined, saleyardPriceMap, saleyardBreedPriceMap
    );
    portfolioValue += result.netValue;
    totalPreBirthAccrual += result.preBirthAccrual;
    totalCalvesAtFootValue += result.calvesAtFootValue;
    if (result.priceSource !== "saleyard") fallbackCount++;
  }
  const totalBreedingAccrual = totalPreBirthAccrual + totalCalvesAtFootValue;
  const totalCalvesAtFootHead = activeHerds.reduce((sum, h) => {
    const parsed = parseCalvesAtFoot(h.additional_info);
    return sum + (parsed?.headCount ?? 0);
  }, 0);
  const breederCount = activeHerds.filter((h) => h.is_breeder).length;
  const pregnantCount = activeHerds.filter((h) => h.is_pregnant).length;

  // Record today's portfolio snapshot (upsert so repeat visits just update)
  const now = new Date();
  const todayDate = now.toISOString().slice(0, 10);
  if (activeHerds.length > 0) {
    await supabase.from("portfolio_snapshots").upsert(
      {
        user_id: user.id,
        snapshot_date: todayDate,
        total_value: Math.round(portfolioValue),
        head_count: totalHead,
        herd_count: activeHerds.length,
      },
      { onConflict: "user_id,snapshot_date" }
    );
  }

  // Backfill historic snapshots if none exist yet.
  // Generates weekly snapshots from the earliest herd creation date to yesterday,
  // using current market prices with correct weight projections for each date.
  const { count: snapshotCount } = await supabase
    .from("portfolio_snapshots")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((snapshotCount ?? 0) <= 1 && activeHerds.length > 0) {
    const creationDates = activeHerds
      .map((h) => h.created_at ? new Date(h.created_at) : null)
      .filter((d): d is Date => d !== null);
    const earliest = creationDates.length > 0
      ? new Date(Math.min(...creationDates.map((d) => d.getTime())))
      : null;

    if (earliest && earliest.getTime() < now.getTime() - 86_400_000) {
      const backfillRows: { user_id: string; snapshot_date: string; total_value: number; head_count: number; herd_count: number }[] = [];
      const cursor = new Date(earliest);

      while (cursor.getTime() < now.getTime() - 86_400_000) {
        const asOfDate = new Date(cursor);
        const herdsAtDate = activeHerds.filter((h) => {
          if (!h.created_at) return false;
          return new Date(h.created_at).getTime() <= asOfDate.getTime();
        });

        if (herdsAtDate.length > 0) {
          const dateVal = herdsAtDate.reduce((sum, h) => {
            const herdWithOverride = saleyardOverride ? { ...h, selected_saleyard: saleyardOverride } : h;
            return sum + calculateHerdValuation(
              herdWithOverride as Parameters<typeof calculateHerdValuation>[0],
              nationalPriceMap, premiumMap, asOfDate, saleyardPriceMap, saleyardBreedPriceMap
            ).netValue;
          }, 0);
          const dateHeads = herdsAtDate.reduce((sum, h) => sum + (h.head_count ?? 0), 0);

          backfillRows.push({
            user_id: user.id,
            snapshot_date: cursor.toISOString().slice(0, 10),
            total_value: Math.round(dateVal),
            head_count: dateHeads,
            herd_count: herdsAtDate.length,
          });
        }

        cursor.setDate(cursor.getDate() + 7);
      }

      if (backfillRows.length > 0) {
        await supabase
          .from("portfolio_snapshots")
          .upsert(backfillRows, { onConflict: "user_id,snapshot_date" });
      }
    }
  }

  // Fetch historic snapshots (before today)
  const { data: snapshots } = await supabase
    .from("portfolio_snapshots")
    .select("snapshot_date, total_value")
    .eq("user_id", user.id)
    .lt("snapshot_date", todayDate)
    .order("snapshot_date", { ascending: true });

  // Build chart data: historic snapshots + today (pass raw dates for client-side range filtering)
  const historicPoints = (snapshots ?? []).map((s) => ({
    date: s.snapshot_date,
    value: Math.round(Number(s.total_value)),
  }));
  const chartData = [...historicPoints, { date: todayDate, value: Math.round(portfolioValue) }];

  const topHerds = [...activeHerds]
    .sort((a, b) => (b.head_count ?? 0) - (a.head_count ?? 0))
    .slice(0, 6);

  // Group top herds by property for the Largest Herds card
  const propertyMap = new Map((properties ?? []).map((p) => [p.id, p.property_name]));
  const herdsByProperty = new Map<string, typeof topHerds>();
  for (const h of topHerds) {
    const key = h.property_id ? (propertyMap.get(h.property_id) ?? "Other") : "Unassigned";
    const group = herdsByProperty.get(key) ?? [];
    group.push(h);
    herdsByProperty.set(key, group);
  }

  const hasData = activeHerds.length > 0;

  // Compute growth & mortality stats
  const herdsWithMortality = activeHerds.filter((h) => h.mortality_rate > 0);
  const avgMortalityRate =
    herdsWithMortality.length > 0
      ? herdsWithMortality.reduce((sum, h) => sum + h.mortality_rate, 0) / herdsWithMortality.length
      : 0;
  const herdsWithDwg = activeHerds.filter((h) => h.daily_weight_gain > 0);
  const avgDailyWeightGain =
    herdsWithDwg.length > 0
      ? herdsWithDwg.reduce((sum, h) => sum + h.daily_weight_gain, 0) / herdsWithDwg.length
      : 0;

  // Change ticker: compare today vs previous snapshot
  const todayVal = Math.round(portfolioValue);
  const prevVal = historicPoints.length > 0 ? historicPoints[historicPoints.length - 1].value : undefined;
  const changeDollar =
    prevVal !== undefined ? todayVal - prevVal : undefined;
  const changePercent =
    prevVal !== undefined && prevVal > 0
      ? ((todayVal - prevVal) / prevVal) * 100
      : undefined;

  // Evaluate insights
  const insights = hasData ? await evaluateInsights() : [];

  return (
    <>
      <div className="max-w-4xl">
        {!hasData ? (
          /* Empty state - matches iOS EmptyDashboardView */
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <h2 className="text-2xl font-bold text-text-primary">
              Welcome to Your Dashboard
            </h2>
            <p className="mt-3 max-w-md text-sm text-text-secondary">
              Add your first herd to see live valuations, market trends, and portfolio insights.
            </p>

            <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
              <Link
                href="/dashboard/herds/new"
                className="inline-flex w-full items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Add Your First Herd
              </Link>
              <LoadDemoDataButton />
            </div>
          </div>
        ) : (
          <div>
            <PageHeader
              title={`G\u2019day, ${displayName}!`}
              titleClassName="text-4xl font-bold text-brand"
              subtitle="Here&#8217;s your herd overview."
            />

            {/* Top row: value + stats */}
            <div className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-4 lg:gap-4">
              <PortfolioValueCard
                value={portfolioValue}
                changeDollar={changeDollar}
                changePercent={changePercent}
                fallbackCount={fallbackCount}
              />
              <StatCard icon={<Tags className="h-3.5 w-3.5" />} label="Head" value={totalHead.toLocaleString()} />
              <StatCard icon={<Layers className="h-3.5 w-3.5" />} label="Herds" value={String(herdCount)} />
              <StatCard icon={<MapPinned className="h-3.5 w-3.5" />} label="Properties" value={String(propertyCount)} />
            </div>

            {/* Portfolio Outlook chart - full width */}
            <div className="mt-3 lg:mt-4">
              <OutlookCard data={chartData} />
            </div>

            {/* Saleyard selector - full width */}
            <div className="mt-3 lg:mt-4">
              <DashboardSaleyardSelector
                currentSaleyard={saleyardOverride ?? null}
                primaryProperty={(properties ?? []).find((p) => p.is_default) ?? (properties ?? [])[0] ?? null}
              />
            </div>

            {/* Two columns */}
            <div className="mt-3 grid grid-cols-1 gap-3 lg:mt-4 lg:grid-cols-2 lg:gap-4">
              {/* Left column */}
              <div className="flex flex-col gap-3 lg:gap-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
                          <IconCattleTags className="h-3.5 w-3.5 text-brand" />
                        </div>
                        <CardTitle>Herd Composition</CardTitle>
                      </div>
                      <Link
                        href="/dashboard/herds"
                        className="text-xs font-medium text-brand hover:underline"
                      >
                        View all
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <HerdComposition herds={activeHerds} />
                  </CardContent>
                </Card>

                <ComingUpCard items={upcomingItems ?? []} />

                <GrowthMortalityCard
                  avgMortalityRate={avgMortalityRate}
                  avgDailyWeightGain={avgDailyWeightGain}
                  totalHead={totalHead}
                />

                {totalBreedingAccrual > 0 && (
                  <CalvingAccrualCard
                    totalAccrual={totalPreBirthAccrual}
                    calvesAtFootValue={totalCalvesAtFootValue}
                    calvesAtFootHead={totalCalvesAtFootHead}
                    breederCount={breederCount}
                    pregnantCount={pregnantCount}
                  />
                )}
              </div>

              {/* Right column */}
              <div className="flex min-w-0 flex-col gap-3 lg:gap-4">
              <DashboardInsights insights={insights} />

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
                        <IconCattleTags className="h-3.5 w-3.5 text-brand" />
                      </div>
                      <CardTitle>Largest Herds</CardTitle>
                    </div>
                    <span className="text-xs text-text-muted">by head count</span>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  {[...herdsByProperty.entries()].map(([propName, herds], groupIdx) => (
                    <div key={propName} className={groupIdx > 0 ? "mt-4" : ""}>
                      <div className="flex items-center gap-1.5 pb-2">
                        <MapPinned className="h-3 w-3 text-text-muted" />
                        <p className="text-xs font-medium text-text-muted">{propName}</p>
                      </div>
                      <ul className="divide-y divide-white/5">
                        {herds.map((herd) => (
                          <li key={herd.id}>
                            <Link
                              href={`/dashboard/herds/${herd.id}`}
                              className="-mx-2 flex items-center justify-between rounded-lg px-2 py-3 transition-colors hover:bg-white/[0.03]"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-text-primary">
                                  {herd.name}
                                </p>
                                <p className="text-xs text-text-muted">
                                  {herd.breed} &middot; {herd.sub_category && herd.sub_category !== herd.category ? `${herd.category} (${herd.sub_category})` : herd.category}
                                </p>
                              </div>
                              <div className="ml-4 flex flex-shrink-0 items-center gap-3">
                                <span className="text-sm font-semibold tabular-nums text-text-primary">
                                  {herd.head_count?.toLocaleString()} hd
                                </span>
                                {herd.current_weight > 0 && (
                                  <span className="text-xs tabular-nums text-text-muted">
                                    {herd.current_weight} kg
                                  </span>
                                )}
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

          </div>
          </div>
        )}
      </div>
    </>
  );
}
