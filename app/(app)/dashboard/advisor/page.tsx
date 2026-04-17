import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { ConnectionRealtime } from "@/components/app/advisory/connection-realtime";
import { hasActivePermission, canShare, isAdvisorRole, type ConnectionRequest } from "@/lib/types/advisory";
import { UserCheck, Clock, Shield, Users, MapPin, DollarSign } from "lucide-react";
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

  // Fetch connections in both directions (advisor-initiated and farmer-initiated)
  const { data: connections } = await supabase
    .from("connection_requests")
    .select("*")
    .or(`requester_user_id.eq.${user.id},target_user_id.eq.${user.id}`)
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

  // Aggregate total livestock value from client portfolio snapshots.
  // Only includes clients whose sharing_permissions.valuations is true and
  // whose connection is both approved and unexpired (canShare handles all three).
  const valuationClientIds = allConnections
    .filter((c) => canShare(c, "valuations"))
    .map((c) => c.requester_user_id === user.id ? c.target_user_id : c.requester_user_id);

  let totalValue: number | undefined;
  const clientValueMap = new Map<string, number>();

  if (valuationClientIds.length > 0) {
    const svc = createServiceRoleClient();
    const today = new Date().toISOString().slice(0, 10);

    // Get latest snapshot per client (today or most recent)
    const { data: latestSnapshots } = await svc
      .from("portfolio_snapshots")
      .select("user_id, total_value, snapshot_date")
      .in("user_id", valuationClientIds)
      .lte("snapshot_date", today)
      .order("snapshot_date", { ascending: false });

    if (latestSnapshots && latestSnapshots.length > 0) {
      // Keep only the most recent per user
      const latestByUser = new Map<string, { total_value: number; snapshot_date: string }>();
      for (const snap of latestSnapshots) {
        if (!latestByUser.has(snap.user_id)) {
          latestByUser.set(snap.user_id, snap);
          clientValueMap.set(snap.user_id, Number(snap.total_value));
        }
      }
      totalValue = Array.from(latestByUser.values()).reduce((sum, s) => sum + Number(s.total_value), 0);

    }
  }

  return (
    <div className="max-w-4xl">
      <ConnectionRealtime userId={user.id} />
      <PageHeader
        title={`Welcome, ${firstName}`}
        titleClassName="text-4xl font-bold text-[#2F8CD9]"
        subtitle="Your advisor workspace overview."
      />

      {/* Stats row */}
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:mb-4 lg:gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2F8CD9]/10">
              <DollarSign className="h-5 w-5 text-[#2F8CD9]" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-text-primary">
                {totalValue !== undefined
                  ? `$${Math.round(totalValue).toLocaleString()}`
                  : "\u2014"}
              </p>
              <p className="text-[11px] text-text-muted">Under Management</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
              <UserCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{totalClients}</p>
              <p className="text-[11px] text-text-muted">Total Clients</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2F8CD9]/10">
              <Shield className="h-5 w-5 text-[#2F8CD9]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{activePerms}</p>
              <p className="text-[11px] text-text-muted">Sharing Data</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">{pending}</p>
              <p className="text-[11px] text-text-muted">Pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two-column: Recent Clients + LGA chart */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
        {/* Recent Clients */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2F8CD9]/15">
                  <Users className="h-3.5 w-3.5 text-[#2F8CD9]" />
                </div>
                <CardTitle>Recent Clients</CardTitle>
              </div>
              <Link
                href="/dashboard/advisor/clients/connected"
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
              variant="advisor"
            />
          ) : (
            <CardContent className="px-5 pb-5">
              <ul className="divide-y divide-white/5">
                {recentClients.map((conn) => {
                  const clientId = conn.requester_user_id === user.id ? conn.target_user_id : conn.requester_user_id;
                  const clientProfile = profileMap.get(clientId);
                  const isActive = hasActivePermission(conn);
                  const clientValue = clientValueMap.get(clientId);
                  return (
                    <li key={conn.id}>
                      <Link
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
                        <div className="flex shrink-0 items-center gap-3">
                          {clientValue !== undefined && (
                            <p className="text-sm font-semibold tabular-nums text-text-primary">
                              ${Math.round(clientValue).toLocaleString()}
                            </p>
                          )}
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
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          )}
        </Card>

        {/* Right column: LGA chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2F8CD9]/15">
                <MapPin className="h-3.5 w-3.5 text-[#2F8CD9]" />
              </div>
              <CardTitle>Clients by Local Govt Area</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <ClientsByLgaChart data={lgaData} total={totalClients} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
