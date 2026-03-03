import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName = user?.user_metadata?.first_name || "Stockman";

  // Fetch real data in parallel
  const [{ data: herds }, { data: properties }] = await Promise.all([
    supabase
      .from("herds")
      .select("id, name, species, breed, category, head_count, current_weight, is_sold")
      .eq("user_id", user!.id)
      .eq("is_sold", false)
      .order("name"),
    supabase
      .from("properties")
      .select("id, property_name, state")
      .eq("user_id", user!.id)
      .order("property_name"),
  ]);

  const activeHerds = herds ?? [];
  const totalHead = activeHerds.reduce((sum, h) => sum + (h.head_count ?? 0), 0);
  const herdCount = activeHerds.length;
  const propertyCount = properties?.length ?? 0;

  // Top 5 herds by head count for the overview
  const topHerds = [...activeHerds]
    .sort((a, b) => (b.head_count ?? 0) - (a.head_count ?? 0))
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={`G'day, ${firstName}`}
        subtitle="Here's your farm at a glance."
      />

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Head" value={totalHead > 0 ? totalHead.toLocaleString() : "—"} />
        <StatCard label="Active Herds" value={herdCount > 0 ? herdCount.toLocaleString() : "—"} />
        <StatCard label="Properties" value={propertyCount > 0 ? propertyCount.toLocaleString() : "—"} />
        <StatCard label="Avg Head/Herd" value={herdCount > 0 ? Math.round(totalHead / herdCount).toLocaleString() : "—"} />
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Herds Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Herds Overview</CardTitle>
              <Link href="/dashboard/herds" className="text-xs font-medium text-brand hover:underline">
                View all
              </Link>
            </div>
          </CardHeader>
          {activeHerds.length === 0 ? (
            <EmptyState
              title="No herds yet"
              description="Your herds will appear here. Add herds from your iOS app or create them here."
              actionLabel="Add Herd"
              actionHref="/dashboard/herds/new"
            />
          ) : (
            <CardContent className="divide-y divide-black/5 dark:divide-white/5">
              {topHerds.map((herd) => (
                <Link
                  key={herd.id}
                  href={`/dashboard/herds/${herd.id}`}
                  className="flex items-center justify-between py-3 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02] -mx-2 px-2 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {herd.name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {herd.breed} · {herd.category}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">
                      {herd.head_count?.toLocaleString()} hd
                    </span>
                    <Badge variant="brand">{herd.species}</Badge>
                  </div>
                </Link>
              ))}
            </CardContent>
          )}
        </Card>

        {/* Properties */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Properties</CardTitle>
              <Link href="/dashboard/properties" className="text-xs font-medium text-brand hover:underline">
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
            <CardContent className="divide-y divide-black/5 dark:divide-white/5">
              {properties.map((prop) => (
                <Link
                  key={prop.id}
                  href={`/dashboard/properties/${prop.id}`}
                  className="flex items-center justify-between py-3 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02] -mx-2 px-2 rounded-lg"
                >
                  <p className="text-sm font-medium text-text-primary">
                    {prop.property_name}
                  </p>
                  <Badge variant="default">{prop.state}</Badge>
                </Link>
              ))}
            </CardContent>
          )}
        </Card>

        {/* Market Snapshot */}
        <Card>
          <CardHeader>
            <CardTitle>Market Snapshot</CardTitle>
          </CardHeader>
          <EmptyState
            title="Market data loading"
            description="Live MLA cattle indicators and recent saleyard results will appear here."
          />
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/dashboard/herds/new"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            >
              <svg className="h-5 w-5 text-brand" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add New Herd
            </Link>
            <Link
              href="/dashboard/properties/new"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            >
              <svg className="h-5 w-5 text-brand" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add New Property
            </Link>
            <Link
              href="/dashboard/tools"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            >
              <svg className="h-5 w-5 text-brand" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm2.25-4.5h.008v.008H10.5v-.008zm0 2.25h.008v.008H10.5v-.008zm0 2.25h.008v.008H10.5v-.008zm2.25-4.5h.008v.008H12.75v-.008zm0 2.25h.008v.008H12.75v-.008zm2.25-4.5h.008v.008H15v-.008zm0 2.25h.008v.008H15v-.008zM4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
              Freight Calculator
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
