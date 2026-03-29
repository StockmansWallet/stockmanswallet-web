import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { hasActivePermission, isAdvisorRole, type ConnectionRequest } from "@/lib/types/advisory";
import { Users, ShieldCheck, Clock, Search, MapPin } from "lucide-react";
import { ClientsByRegionChart } from "@/components/app/advisory/clients-by-region-chart";

export const metadata = {
  title: "Advisor Dashboard",
};

export default async function AdvisorDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Redirect producers away from advisor dashboard
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile?.role || !isAdvisorRole(profile.role)) {
    redirect("/dashboard");
  }

  const firstName = user.user_metadata?.first_name || "Advisor";

  // Fetch connections where current user is the advisor (requester)
  const { data: connections } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("requester_user_id", user.id)
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: false });

  const allConnections = (connections ?? []) as ConnectionRequest[];

  // Get client profiles for recent list
  const clientUserIds = allConnections.slice(0, 5).map((c) => c.target_user_id);
  const { data: clientProfiles } = clientUserIds.length > 0
    ? await supabase
        .from("user_profiles")
        .select("user_id, display_name, company_name")
        .in("user_id", clientUserIds)
    : { data: [] as { user_id: string; display_name: string | null; company_name: string | null }[] };

  const profileMap = new Map(
    (clientProfiles ?? []).map((p) => [p.user_id, p])
  );

  // Fetch default properties for all connected clients to get LGA data
  const allClientUserIds = allConnections.map((c) => c.target_user_id);
  const { data: clientProperties } = allClientUserIds.length > 0
    ? await supabase
        .from("properties")
        .select("user_id, lga")
        .in("user_id", allClientUserIds)
        .eq("is_default", true)
        .eq("is_deleted", false)
    : { data: [] as { user_id: string; lga: string | null }[] };

  // Build region distribution from LGA data
  const lgaCounts: Record<string, number> = {};
  for (const prop of clientProperties ?? []) {
    const lga = prop.lga || "Not specified";
    lgaCounts[lga] = (lgaCounts[lga] || 0) + 1;
  }
  const totalWithRegion = Object.values(lgaCounts).reduce((a, b) => a + b, 0);
  const regionData = Object.entries(lgaCounts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalWithRegion > 0 ? Math.round((count / totalWithRegion) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Stats
  const totalClients = allConnections.length;
  const activePerms = allConnections.filter((c) => hasActivePermission(c)).length;
  const pending = allConnections.filter((c) => c.status === "pending").length;
  const recentClients = allConnections.slice(0, 5);

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={`Welcome, ${firstName}`}
        titleClassName="text-4xl font-bold text-purple-400"
        subtitle="Your advisor workspace overview."
      />

      {/* Stats row */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/15">
              <Users className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-text-primary">
                {totalClients}
              </p>
              <p className="text-xs text-text-muted">Total Clients</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/15">
              <ShieldCheck className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-text-primary">
                {activePerms}
              </p>
              <p className="text-xs text-text-muted">Sharing Data</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-text-primary">
                {pending}
              </p>
              <p className="text-xs text-text-muted">Pending Requests</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
        {/* Left column - Recent clients */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 lg:gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Clients</CardTitle>
                <Link
                  href="/dashboard/advisor/clients"
                  className="text-xs font-medium text-purple-400 hover:underline"
                >
                  View all
                </Link>
              </div>
            </CardHeader>
            {recentClients.length === 0 ? (
              <EmptyState
                title="No clients yet"
                description="Connect with producers to start managing your advisory portfolio."
                variant="purple"
              />
            ) : (
              <CardContent className="divide-y divide-white/5 px-5 pb-5">
                {recentClients.map((conn) => {
                  const profile = profileMap.get(conn.target_user_id);
                  const isActive = hasActivePermission(conn);
                  return (
                    <Link
                      key={conn.id}
                      href={`/dashboard/advisor/clients/${conn.id}`}
                      className="-mx-2 flex items-center justify-between rounded-lg px-2 py-3 transition-colors hover:bg-white/[0.03]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {profile?.display_name ?? "Unknown Producer"}
                        </p>
                        {profile?.company_name && (
                          <p className="text-xs text-text-muted">
                            {profile.company_name}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={
                          conn.status === "pending"
                            ? "warning"
                            : isActive
                              ? "success"
                              : "default"
                        }
                      >
                        {conn.status === "pending"
                          ? "Pending"
                          : isActive
                            ? "Active"
                            : "Expired"}
                      </Badge>
                    </Link>
                  );
                })}
              </CardContent>
            )}
          </Card>
        </div>

        {/* Right column - Quick actions + info */}
        <div className="flex w-full flex-col gap-3 lg:w-[340px] lg:gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5">
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/dashboard/advisor/clients"
                  className="group flex flex-col items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-4 text-center transition-colors hover:bg-white/[0.06]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400 transition-transform group-hover:scale-105">
                    <Users className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] font-medium text-text-secondary">
                    My Clients
                  </span>
                </Link>
                <Link
                  href="/dashboard/advisory-hub/directory"
                  className="group flex flex-col items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-4 text-center transition-colors hover:bg-white/[0.06]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400 transition-transform group-hover:scale-105">
                    <Search className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] font-medium text-text-secondary">
                    Find Producers
                  </span>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-purple-500/10">
                  <ShieldCheck className="h-4 w-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    Permission Windows
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">
                    Access to client data is granted in 3-day windows.
                    Producers control when you can view their herds and
                    valuations.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Clients by Region */}
      <div className="mt-3 lg:mt-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15">
                <MapPin className="h-4 w-4 text-purple-400" />
              </div>
              <CardTitle>Clients by Region</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <ClientsByRegionChart data={regionData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
