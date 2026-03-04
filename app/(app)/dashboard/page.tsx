import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { HerdComposition } from "./herd-composition";
import { PortfolioChart } from "./portfolio-chart";
import { defaultFallbackPrice } from "@/lib/engines/valuation-engine";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName = user?.user_metadata?.first_name || "Stockman";

  const [{ data: herds }, { data: properties }] = await Promise.all([
    supabase
      .from("herd_groups")
      .select("id, name, species, breed, category, head_count, current_weight, daily_weight_gain, is_sold")
      .eq("user_id", user!.id)
      .eq("is_sold", false)
      .eq("is_deleted", false)
      .order("name"),
    supabase
      .from("properties")
      .select("id, property_name, state, acreage")
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .order("property_name"),
  ]);

  const activeHerds = herds ?? [];
  const totalHead = activeHerds.reduce((sum, h) => sum + (h.head_count ?? 0), 0);
  const herdCount = activeHerds.length;
  const propertyCount = properties?.length ?? 0;

  // Portfolio value: head_count × current_weight × fallback $/kg
  const portfolioValue = activeHerds.reduce((sum, h) => {
    const price = defaultFallbackPrice(h.category ?? "");
    return sum + (h.head_count ?? 0) * (h.current_weight ?? 0) * price;
  }, 0);

  // 12-month portfolio projection based on daily weight gain
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const chartData = Array.from({ length: 13 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const label = `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    const value = activeHerds.reduce((sum, h) => {
      const head = h.head_count ?? 0;
      const weight = (h.current_weight ?? 0) + (h.daily_weight_gain ?? 0) * 30 * i;
      const price = defaultFallbackPrice(h.category ?? "");
      return sum + head * weight * price;
    }, 0);
    return { month: label, value: Math.round(value) };
  });

  const topHerds = [...activeHerds]
    .sort((a, b) => (b.head_count ?? 0) - (a.head_count ?? 0))
    .slice(0, 6);

  const hasData = activeHerds.length > 0;

  return (
    <div className="mx-auto max-w-6xl">
      {/* ── Hero ── */}
      <div className="mb-8">
        <p className="text-sm text-text-muted">
          G&rsquo;day, {firstName}
        </p>

        {hasData ? (
          <div className="mt-2">
            <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
              ${Math.round(portfolioValue).toLocaleString()}
            </h1>
            <p className="mt-1 text-sm text-text-muted">Portfolio Value</p>

            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className="text-text-secondary">
                <span className="font-semibold text-text-primary">{totalHead.toLocaleString()}</span> head
              </span>
              <span className="text-text-secondary">
                <span className="font-semibold text-text-primary">{herdCount}</span> active herds
              </span>
              <span className="text-text-secondary">
                <span className="font-semibold text-text-primary">{propertyCount}</span>{" "}
                {propertyCount === 1 ? "property" : "properties"}
              </span>
              {herdCount > 0 && (
                <span className="text-text-secondary">
                  <span className="font-semibold text-text-primary">
                    {Math.round(totalHead / herdCount)}
                  </span>{" "}
                  avg hd/herd
                </span>
              )}
            </div>
          </div>
        ) : (
          <h1 className="mt-1 text-2xl font-bold text-text-primary">
            Welcome to Stockman&rsquo;s Wallet
          </h1>
        )}
      </div>

      {!hasData ? (
        /* ── Empty state ── */
        <Card>
          <EmptyState
            title="No herds yet"
            description="Add your first herd to see your farm at a glance, or load the demo data from Settings."
            actionLabel="Add Herd"
            actionHref="/dashboard/herds/new"
          />
        </Card>
      ) : (
        <>
          {/* ── Portfolio Breakdown (full width) ── */}
          <Card className="mb-6">
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

          {/* ── Main grid ── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Herd Composition */}
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

            {/* Top Herds */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Largest Herds</CardTitle>
                  <span className="text-xs text-text-muted">by head count</span>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 divide-y divide-white/5">
                {topHerds.map((herd) => (
                  <Link
                    key={herd.id}
                    href={`/dashboard/herds/${herd.id}`}
                    className="flex items-center justify-between py-3 -mx-2 px-2 rounded-lg transition-colors hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {herd.name}
                      </p>
                      <p className="text-xs text-text-muted">
                        {herd.breed} · {herd.category}
                      </p>
                    </div>
                    <div className="ml-4 flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-semibold text-text-primary tabular-nums">
                        {herd.head_count?.toLocaleString()} hd
                      </span>
                      {herd.current_weight > 0 && (
                        <span className="text-xs text-text-muted tabular-nums">
                          {herd.current_weight} kg
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>

            {/* Properties */}
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
                <CardContent className="px-5 pb-5 divide-y divide-white/5">
                  {properties.map((prop) => (
                    <Link
                      key={prop.id}
                      href={`/dashboard/properties/${prop.id}`}
                      className="flex items-center justify-between py-3 -mx-2 px-2 rounded-lg transition-colors hover:bg-white/[0.03]"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {prop.property_name}
                        </p>
                        {prop.acreage && (
                          <p className="text-xs text-text-muted">
                            {prop.acreage.toLocaleString()} acres
                          </p>
                        )}
                      </div>
                      <Badge variant="default">{prop.state}</Badge>
                    </Link>
                  ))}
                </CardContent>
              )}
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Link
                  href="/dashboard/herds/new"
                  className="group flex flex-col items-center gap-2 rounded-xl bg-white/[0.03] px-4 py-5 text-center transition-colors hover:bg-white/[0.06]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15 text-brand transition-transform group-hover:scale-105">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-text-secondary">Add Herd</span>
                </Link>
                <Link
                  href="/dashboard/properties/new"
                  className="group flex flex-col items-center gap-2 rounded-xl bg-white/[0.03] px-4 py-5 text-center transition-colors hover:bg-white/[0.06]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15 text-brand transition-transform group-hover:scale-105">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-text-secondary">Add Property</span>
                </Link>
                <Link
                  href="/dashboard/tools"
                  className="group flex flex-col items-center gap-2 rounded-xl bg-white/[0.03] px-4 py-5 text-center transition-colors hover:bg-white/[0.06]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15 text-brand transition-transform group-hover:scale-105">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-3.375c0-.621-.504-1.125-1.125-1.125H18M8.25 18.75l-1.5-6h13.5l-1.5 6M2.25 14.25l3-9h13.5l3 9" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-text-secondary">Freight Calc</span>
                </Link>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
