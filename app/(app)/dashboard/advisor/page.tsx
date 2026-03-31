import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { hasActivePermission, isAdvisorRole, type ConnectionRequest } from "@/lib/types/advisory";
import { Users, Search, TrendingUp } from "lucide-react";
import { ClientsByLgaChart } from "@/components/app/advisory/clients-by-lga-chart";

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

  // Fetch connections + client data via RPC (SECURITY DEFINER bypasses RLS on properties)
  const { data: connections } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("requester_user_id", user.id)
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: false });

  const allConnections = (connections ?? []) as ConnectionRequest[];

  // RPC returns client profile + default property LGA in one query
  const { data: advisorConns } = await supabase.rpc("get_advisor_connections");
  const connRows = (advisorConns ?? []) as {
    connection_id: string;
    target_user_id: string;
    client_display_name: string | null;
    client_company_name: string | null;
    client_property_name: string | null;
    client_lga: string | null;
  }[];

  // Build profile map from RPC data (for Recent Clients display)
  const profileMap = new Map(
    connRows.map((r) => [r.target_user_id, {
      user_id: r.target_user_id,
      display_name: r.client_display_name,
      company_name: r.client_company_name,
      property_name: r.client_property_name,
    }])
  );

  // Build LGA distribution from connection data
  const lgaCounts: Record<string, number> = {};
  for (const row of connRows) {
    const lga = row.client_lga || "Not specified";
    lgaCounts[lga] = (lgaCounts[lga] || 0) + 1;
  }
  const totalWithLga = Object.values(lgaCounts).reduce((a, b) => a + b, 0);
  const lgaData = Object.entries(lgaCounts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalWithLga > 0 ? Math.round((count / totalWithLga) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Stats
  const totalClients = allConnections.length;
  const activePerms = allConnections.filter((c) => hasActivePermission(c)).length;
  const pending = allConnections.filter((c) => c.status === "pending").length;
  const recentClients = allConnections.slice(0, 5);

  return (
    <div className="max-w-5xl">
      {/* Top row: Welcome + Total Value */}
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] lg:mb-4 lg:gap-4">
        <Card>
          <CardContent className="p-5">
            <h1 className="text-2xl font-bold text-[#2F8CD9] sm:text-3xl">
              Welcome, {firstName}
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Your advisor workspace overview.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 text-center sm:min-w-[240px]">
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Total Livestock Under Management
            </p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums text-text-primary sm:text-3xl">
              {/* TODO: aggregate portfolio value across all clients (needs cached/RPC approach) */}
              &mdash;
            </p>
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-text-muted">
              <TrendingUp className="h-3 w-3" />
              Available soon
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Stats row */}
      <div className="mb-3 grid grid-cols-3 gap-3 lg:mb-4 lg:gap-4">
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#2F8CD9]" />
              <p className="text-2xl font-bold tabular-nums text-text-primary">
                {totalClients}
              </p>
            </div>
            <p className="mt-1 text-xs text-text-muted">Total Clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <p className="text-2xl font-bold tabular-nums text-text-primary">
                {activePerms}
              </p>
            </div>
            <p className="mt-1 text-xs text-text-muted">Sharing Data</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <p className="text-2xl font-bold tabular-nums text-text-primary">
                {pending}
              </p>
            </div>
            <p className="mt-1 text-xs text-text-muted">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Two-column: Recent Clients (narrow) + LGA chart (wider) */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_3fr] lg:gap-4">
        {/* Recent Clients */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Clients</CardTitle>
              <Link
                href="/dashboard/advisor/clients"
                className="text-xs font-medium text-[#2F8CD9] hover:underline"
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
                const clientProfile = profileMap.get(conn.target_user_id);
                const isActive = hasActivePermission(conn);
                return (
                  <Link
                    key={conn.id}
                    href={`/dashboard/advisor/clients/${conn.id}`}
                    className="-mx-2 flex items-center justify-between rounded-lg px-2 py-3 transition-colors hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {clientProfile?.display_name ?? "Unknown Producer"}
                      </p>
                      {clientProfile?.property_name && (
                        <p className="truncate text-xs text-text-muted">
                          {clientProfile.property_name}
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

        {/* Right column: LGA chart + Quick actions */}
        <div className="flex flex-col gap-3 lg:gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Clients by Local Govt Area</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <ClientsByLgaChart data={lgaData} total={totalClients} />
            </CardContent>
          </Card>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3 lg:gap-4">
            <Link href="/dashboard/advisor/clients">
              <Card className="transition-colors hover:bg-white/[0.03]">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2F8CD9]/15">
                    <Users className="h-4 w-4 text-[#2F8CD9]" />
                  </div>
                  <span className="text-sm font-medium text-text-secondary">
                    My Clients
                  </span>
                </CardContent>
              </Card>
            </Link>
            <Link href="/dashboard/advisory-hub/directory">
              <Card className="transition-colors hover:bg-white/[0.03]">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2F8CD9]/15">
                    <Search className="h-4 w-4 text-[#2F8CD9]" />
                  </div>
                  <span className="text-sm font-medium text-text-secondary">
                    Find Producers
                  </span>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
