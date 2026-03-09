import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { HerdComposition } from "./herd-composition";
import { PortfolioChart } from "./portfolio-chart";
import { calculateHerdValuation, mapCategoryToMLACategory, type CategoryPriceEntry } from "@/lib/engines/valuation-engine";
import { cattleBreedPremiums, resolveMLASaleyardName } from "@/lib/data/reference-data";
import { UserProfileCard } from "@/components/app/user-profile-card";
import { PortfolioValueCard } from "@/components/app/portfolio-value-card";
import { DashboardQuickActions } from "@/components/app/dashboard-quick-actions";
import { ComingUpCard } from "@/components/app/coming-up-card";
import { GrowthMortalityCard } from "@/components/app/growth-mortality-card";

export const revalidate = 0;

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName = user?.user_metadata?.first_name || "Stockman";
  const lastName = user?.user_metadata?.last_name || "";
  const userEmail = user?.email || "";
  const userRole = user?.user_metadata?.role || "";

  const todayStr = new Date().toISOString().split("T")[0];

  const [{ data: herds }, { data: properties }, { data: breedPremiumData }, { data: upcomingItems }] = await Promise.all([
    supabase
      .from("herd_groups")
      .select(`id, name, species, breed, category, head_count,
               initial_weight, current_weight, daily_weight_gain,
               dwg_change_date, previous_dwg, created_at,
               is_breeder, is_pregnant, joined_date, calving_rate,
               breeding_program_type, joining_period_start, joining_period_end,
               breed_premium_override, mortality_rate, is_sold, selected_saleyard,
               additional_info, calf_weight_recorded_date, updated_at`)
      .eq("user_id", user!.id)
      .eq("is_sold", false)
      .eq("is_deleted", false)
      .order("name"),
    supabase
      .from("properties")
      .select("id, property_name, state, acreage, is_simulated")
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

  // Fetch pricing data in two parallel queries to avoid 50k limit truncating national prices
  // when multiple saleyards have large datasets. National prices are fetched separately to
  // guarantee they're always complete (critical for fallback resolution).
  const saleyards = [...new Set((herds ?? []).map((h) => h.selected_saleyard ? resolveMLASaleyardName(h.selected_saleyard) : null).filter(Boolean))] as string[];
  const mlaCategories = [...new Set((herds ?? []).map((h) => mapCategoryToMLACategory(h.category)))];

  type PriceRow = { category: string; price_per_kg: number; weight_range: string | null; saleyard: string; breed: string | null; data_date: string };
  const emptyPrices: PriceRow[] = [];

  const [{ data: saleyardPrices }, { data: nationalPrices }] = mlaCategories.length > 0
    ? await Promise.all([
        saleyards.length > 0
          ? supabase
              .from("category_prices")
              .select("category, price_per_kg:final_price_per_kg, weight_range, saleyard, breed, data_date")
              .in("saleyard", saleyards)
              .in("category", mlaCategories)
              .order("data_date", { ascending: false })
              .limit(50000)
          : Promise.resolve({ data: emptyPrices }),
        supabase
          .from("category_prices")
          .select("category, price_per_kg:final_price_per_kg, weight_range, saleyard, breed, data_date")
          .eq("saleyard", "National")
          .in("category", mlaCategories)
          .order("data_date", { ascending: false })
          .limit(5000),
      ])
    : [{ data: emptyPrices }, { data: emptyPrices }];

  const allPrices = [...(saleyardPrices ?? []), ...(nationalPrices ?? [])];

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
  let portfolioValue = 0;
  let fallbackCount = 0;
  for (const h of activeHerds) {
    const result = calculateHerdValuation(
      h as Parameters<typeof calculateHerdValuation>[0],
      nationalPriceMap, premiumMap, undefined, saleyardPriceMap, saleyardBreedPriceMap
    );
    portfolioValue += result.netValue;
    if (result.priceSource !== "saleyard") fallbackCount++;
  }

  // 12-month portfolio projection: advance the valuation date by i×30 days
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const chartData = Array.from({ length: 13 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const label = `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    const futureDate = new Date(now.getTime() + i * 30 * 86_400_000);
    const value = activeHerds.reduce(
      (sum, h) => sum + calculateHerdValuation(
        h as Parameters<typeof calculateHerdValuation>[0],
        nationalPriceMap, premiumMap, futureDate, saleyardPriceMap, saleyardBreedPriceMap
      ).netValue,
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
  const changePercent =
    chartData.length >= 2 && chartData[0].value > 0
      ? ((chartData[1].value - chartData[0].value) / chartData[0].value) * 100
      : undefined;

  return (
    <div className="max-w-6xl">
      {!hasData ? (
        /* ── Empty state ── */
        <div>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-text-primary">
              Welcome to Stockman&rsquo;s Wallet
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Add your first herd to get started.
            </p>
          </div>
          <Card>
            <EmptyState
              title="No herds yet"
              description="Add your first herd to see your farm at a glance, or load the demo data from Settings."
              actionLabel="Add Herd"
              actionHref="/dashboard/herds/new"
            />
          </Card>
        </div>
      ) : (
        <div>
          <div className="mb-3 lg:mb-4">
            <h1 className="text-2xl font-bold text-text-primary">
              G&rsquo;day, {firstName}!
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Here&rsquo;s your herd overview.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
            {/* Left column */}
            <div className="flex min-w-0 flex-1 flex-col gap-3 lg:gap-4">
              <PortfolioValueCard
              value={portfolioValue}
              changePercent={changePercent}
              fallbackCount={fallbackCount}
              totalHead={totalHead}
              herdCount={herdCount}
              propertyCount={propertyCount}
            />

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>12-Month Outlook</CardTitle>
                  <span className="text-xs text-text-muted">projected portfolio value</span>
                </div>
              </CardHeader>
              <CardContent>
                <PortfolioChart data={chartData} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Herd Composition</CardTitle>
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
                  <CardTitle>Largest Herds</CardTitle>
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
                        {herd.breed} &middot; {herd.category}
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

          {/* Right column */}
          <div className="flex w-full flex-col gap-3 lg:w-[340px] lg:gap-4">
            <UserProfileCard
              firstName={firstName}
              lastName={lastName}
              email={userEmail}
              role={userRole}
            />

            <DashboardQuickActions />

            <ComingUpCard items={upcomingItems ?? []} />

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Properties</CardTitle>
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
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
