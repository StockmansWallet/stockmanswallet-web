import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { hasActivePermission, isAdvisorRole, type ConnectionRequest } from "@/lib/types/advisory";
import { Users, Search, TrendingUp, TrendingDown } from "lucide-react";
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

  // Aggregate total livestock value from client portfolio snapshots
  // Uses service client to bypass RLS on portfolio_snapshots
  // Resolve the client (other party) ID regardless of who initiated the connection
  const activeClientIds = allConnections
    .filter((c) => hasActivePermission(c))
    .map((c) => c.requester_user_id === user.id ? c.target_user_id : c.requester_user_id);

  let totalValue: number | undefined;
  let prevTotalValue: number | undefined;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey && activeClientIds.length > 0) {
    const svc = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey);
    const today = new Date().toISOString().slice(0, 10);

    // Get latest snapshot per client (today or most recent)
    const { data: latestSnapshots } = await svc
      .from("portfolio_snapshots")
      .select("user_id, total_value, snapshot_date")
      .in("user_id", activeClientIds)
      .lte("snapshot_date", today)
      .order("snapshot_date", { ascending: false });

    if (latestSnapshots && latestSnapshots.length > 0) {
      // Keep only the most recent per user
      const latestByUser = new Map<string, { total_value: number; snapshot_date: string }>();
      for (const snap of latestSnapshots) {
        if (!latestByUser.has(snap.user_id)) {
          latestByUser.set(snap.user_id, snap);
        }
      }
      totalValue = Array.from(latestByUser.values()).reduce((sum, s) => sum + Number(s.total_value), 0);

      // Get previous snapshots (one before each user's latest) for change ticker
      const prevByUser = new Map<string, number>();
      for (const snap of latestSnapshots) {
        const latest = latestByUser.get(snap.user_id);
        if (latest && snap.snapshot_date < latest.snapshot_date && !prevByUser.has(snap.user_id)) {
          prevByUser.set(snap.user_id, Number(snap.total_value));
        }
      }
      if (prevByUser.size > 0) {
        // Sum previous values for users we have data for, plus latest for users without previous
        prevTotalValue = 0;
        for (const [uid, latestSnap] of latestByUser) {
          prevTotalValue += prevByUser.get(uid) ?? Number(latestSnap.total_value);
        }
      }
    }
  }

  const changeDollar = totalValue !== undefined && prevTotalValue !== undefined
    ? totalValue - prevTotalValue
    : undefined;
  const changePercent = changeDollar !== undefined && prevTotalValue && prevTotalValue > 0
    ? (changeDollar / prevTotalValue) * 100
    : undefined;
  const isPositive = changePercent !== undefined && changePercent >= 0;

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={`Welcome, ${firstName}`}
        titleClassName="text-4xl font-bold text-[#2F8CD9]"
        subtitle="Your advisor workspace overview."
      />

      {/* Top row: Total Value + Stats */}
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr] lg:mb-4 lg:gap-4">
        {/* Total Livestock Under Management */}
        <Card>
          <CardContent className="p-5 text-center sm:min-w-[260px]">
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Total Livestock Under Management
            </p>
            {totalValue !== undefined ? (
              <>
                <p className="mt-1.5 text-2xl font-bold tabular-nums text-text-primary sm:text-3xl">
                  ${Math.round(totalValue).toLocaleString()}
                </p>
                {changePercent !== undefined && (
                  <span className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${isPositive ? "text-success" : "text-error"}`}>
                    {isPositive
                      ? <TrendingUp className="h-3 w-3" />
                      : <TrendingDown className="h-3 w-3" />
                    }
                    {changeDollar !== undefined && (
                      <>
                        ${Math.round(Math.abs(changeDollar)).toLocaleString()}
                        <span className="opacity-50">|</span>
                      </>
                    )}
                    {isPositive ? "+" : ""}{changePercent.toFixed(1)}%
                  </span>
                )}
              </>
            ) : (
              <p className="mt-1.5 text-2xl font-bold text-text-muted">&mdash;</p>
            )}
          </CardContent>
        </Card>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 lg:gap-4">
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
                const clientId = conn.requester_user_id === user.id ? conn.target_user_id : conn.requester_user_id;
                const clientProfile = profileMap.get(clientId);
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
            <Link href="/dashboard/advisor/directory">
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
