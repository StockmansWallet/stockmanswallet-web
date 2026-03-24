import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadDemoDataButton } from "@/components/app/load-demo-data-button";
import { HerdComposition } from "./herd-composition";
import { PortfolioChart } from "./portfolio-chart";
import { calculateHerdValuation, categoryFallback, type CategoryPriceEntry } from "@/lib/engines/valuation-engine";
import { resolveMLACategory } from "@/lib/data/weight-mapping";
import { cattleBreedPremiums, resolveMLASaleyardName } from "@/lib/data/reference-data";
import { PortfolioValueCard } from "@/components/app/portfolio-value-card";
import { ComingUpCard } from "@/components/app/coming-up-card";
import { GrowthMortalityCard } from "@/components/app/growth-mortality-card";
import { DashboardSaleyardSelector } from "@/components/app/dashboard-saleyard-selector";
import { DashboardInsights } from "@/components/app/dashboard-insights";
import { CalvingAccrualCard } from "@/components/app/calving-accrual-card";
import { Wallet, MapPinned, TrendingUp } from "lucide-react";
import { IconCattleTags } from "@/components/icons/icon-cattle-tags";
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

  // Fetch display name: prefer auth metadata, fall back to user_profiles
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", user!.id)
    .maybeSingle();

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
               breeder_sub_type, sub_category`)
      .eq("user_id", user!.id)
      .eq("is_sold", false)
      .eq("is_deleted", false)
      .order("name"),
    supabase
      .from("properties")
      .select("id, property_name, state, acreage, is_simulated, latitude, longitude, is_default, suburb")
      .eq("user_id", user!.id)
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
      .eq("user_id", user!.id)
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
  const saleyards = resolvedOverride
    ? [resolvedOverride]
    : [...new Set((herds ?? []).map((h) => h.selected_saleyard ? resolveMLASaleyardName(h.selected_saleyard) : null).filter(Boolean))] as string[];
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
    if (result.priceSource !== "saleyard") fallbackCount++;
  }
  const breederCount = activeHerds.filter((h) => h.is_breeder).length;
  const pregnantCount = activeHerds.filter((h) => h.is_pregnant).length;

  // 12-month portfolio projection: advance the valuation date by i×30 days
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const chartData = Array.from({ length: 13 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const label = `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    const futureDate = new Date(now.getTime() + i * 30 * 86_400_000);
    const value = activeHerds.reduce(
      (sum, h) => {
        const herdWithOverride = saleyardOverride ? { ...h, selected_saleyard: saleyardOverride } : h;
        return sum + calculateHerdValuation(
          herdWithOverride as Parameters<typeof calculateHerdValuation>[0],
          nationalPriceMap, premiumMap, futureDate, saleyardPriceMap, saleyardBreedPriceMap
        ).netValue;
      },
      0
    );
    return { month: label, value: Math.round(value) };
  });

  const topHerds = [...activeHerds]
    .sort((a, b) => (b.head_count ?? 0) - (a.head_count ?? 0))
    .slice(0, 6);

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

  // Change ticker: compare month 0 vs month 1 projection
  const changeDollar =
    chartData.length >= 2
      ? chartData[1].value - chartData[0].value
      : undefined;
  const changePercent =
    chartData.length >= 2 && chartData[0].value > 0
      ? ((chartData[1].value - chartData[0].value) / chartData[0].value) * 100
      : undefined;

  // Evaluate insights
  const insights = hasData ? await evaluateInsights() : [];

  return (
    <>
      <div className="max-w-6xl">
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
                className="inline-flex w-full items-center justify-center rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
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

            <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
              {/* Left column – narrow sidebar */}
              <div className="flex w-full flex-col gap-3 lg:w-[480px] lg:gap-4">
              <PortfolioValueCard
                value={portfolioValue}
                changeDollar={changeDollar}
                changePercent={changePercent}
                fallbackCount={fallbackCount}
              />

              <DashboardSaleyardSelector currentSaleyard={saleyardOverride ?? null} />

              <ComingUpCard items={upcomingItems ?? []} />

              <DashboardInsights insights={insights} />

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
                        <MapPinned className="h-3.5 w-3.5 text-brand" />
                      </div>
                      <CardTitle>Properties</CardTitle>
                    </div>
                    <Link
                      href="/dashboard/properties"
                      className="text-xs font-medium text-brand hover:underline"
                    >
                      View all
                    </Link>
                  </div>
                </CardHeader>
                {!properties || properties.length === 0 ? (
                  <EmptyState
                    title="No properties yet"
                    description="Add properties to organise your herds by location."
                    actionLabel="Add Property"
                    actionHref="/dashboard/properties/new"
                  />
                ) : (
                  <CardContent className="divide-y divide-white/5 px-5 pb-5">
                    {[...properties]
                      .sort((a, b) => {
                        if (a.is_simulated !== b.is_simulated) return a.is_simulated ? 1 : -1;
                        return 0;
                      })
                      .map((prop, idx) => {
                        const isFirstReal = !prop.is_simulated && idx === 0;
                        return (
                          <Link
                            key={prop.id}
                            href={`/dashboard/properties/${prop.id}`}
                            className="-mx-2 flex items-center justify-between rounded-lg px-2 py-3 transition-colors hover:bg-white/[0.03]"
                          >
                            <div>
                              <p className="text-sm font-medium text-text-primary">
                                {prop.property_name}
                              </p>
                              {(isFirstReal || prop.is_simulated || prop.acreage) && (
                                <p className="text-xs text-text-muted">
                                  {isFirstReal ? "Primary Property" : prop.is_simulated ? "Demo" : ""}
                                  {prop.acreage ? `${isFirstReal || prop.is_simulated ? " · " : ""}${prop.acreage.toLocaleString()} acres` : ""}
                                </p>
                              )}
                            </div>
                            <Badge variant="default">{prop.state}</Badge>
                          </Link>
                        );
                      })}
                  </CardContent>
                )}
              </Card>

              <GrowthMortalityCard
                avgMortalityRate={avgMortalityRate}
                avgDailyWeightGain={avgDailyWeightGain}
                totalHead={totalHead}
              />

              {totalPreBirthAccrual > 0 && (
                <CalvingAccrualCard
                  totalAccrual={totalPreBirthAccrual}
                  breederCount={breederCount}
                  pregnantCount={pregnantCount}
                />
              )}
            </div>

              {/* Right column – main content */}
              <div className="flex min-w-0 flex-1 flex-col gap-3 lg:gap-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
                        <Wallet className="h-3.5 w-3.5 text-brand" />
                      </div>
                      <CardTitle>Portfolio Outlook</CardTitle>
                    </div>
                    <span className="text-xs text-text-muted">projected value</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <PortfolioChart data={chartData} />
                </CardContent>
              </Card>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="px-4 py-3 text-center">
                    <p className="text-xs text-text-muted">Head</p>
                    <p className="text-xl font-bold text-text-primary">{totalHead.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="px-4 py-3 text-center">
                    <p className="text-xs text-text-muted">Herds</p>
                    <p className="text-xl font-bold text-text-primary">{herdCount}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="px-4 py-3 text-center">
                    <p className="text-xs text-text-muted">Properties</p>
                    <p className="text-xl font-bold text-text-primary">{propertyCount}</p>
                  </CardContent>
                </Card>
              </div>

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
                <CardContent className="divide-y divide-white/5 px-5 pb-5">
                  {topHerds.map((herd) => (
                    <Link
                      key={herd.id}
                      href={`/dashboard/herds/${herd.id}`}
                      className="-mx-2 flex items-center justify-between rounded-lg px-2 py-3 transition-colors hover:bg-white/[0.03]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text-primary">
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
