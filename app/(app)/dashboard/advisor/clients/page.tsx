import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConnectionRealtime } from "@/components/app/advisory/connection-realtime";
import { hasActivePermission, type ConnectionRequest } from "@/lib/types/advisory";
import {
  Users,
  Search,
  Shield,
  ArrowRight,
  UserCheck,
  Clock,
} from "lucide-react";

export const revalidate = 0;

export const metadata = {
  title: "Clients",
};

export default async function AdvisorClientsHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Advisory connections only (exclude farmer_peer)
  const { data: connections } = await supabase
    .from("connection_requests")
    .select("id, status, target_user_id, requester_user_id, sharing_permissions, permission_granted_at")
    .or(`requester_user_id.eq.${user.id},target_user_id.eq.${user.id}`)
    .eq("connection_type", "advisory")
    .in("status", ["pending", "approved"]);

  const allConnections = (connections ?? []) as ConnectionRequest[];

  const pendingCount = allConnections.filter((c) => c.status === "pending").length;
  const approvedConnections = allConnections.filter((c) => c.status === "approved");
  const activeCount = approvedConnections.length;
  const sharingCount = approvedConnections.filter((c) => hasActivePermission(c)).length;

  return (
    <div className="max-w-4xl">
      <ConnectionRealtime userId={user.id} />
      <PageHeader
        title="Clients"
        titleClassName="text-4xl font-bold text-[#2F8CD9]"
        subtitle="Manage your client connections"
        subtitleClassName="text-sm font-medium text-text-secondary"
        inline
      />

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
              <UserCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{activeCount}</p>
              <p className="text-[11px] text-text-muted">Connected</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
              <p className="text-[11px] text-text-muted">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2F8CD9]/10">
              <Shield className="h-5 w-5 text-[#2F8CD9]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{sharingCount}</p>
              <p className="text-[11px] text-text-muted">Sharing</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Link href="/dashboard/advisor/clients/connected">
          <Card className="group h-full cursor-pointer transition-all hover:bg-surface-low">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2F8CD9]/15 shadow-sm">
                    <Users className="h-5 w-5 text-[#2F8CD9]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">My Clients</h3>
                    <p className="text-xs text-text-muted">
                      {activeCount > 0 ? `${activeCount} connected` : "No clients yet"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {pendingCount > 0 && (
                    <Badge variant="warning" className="animate-pulse shadow-sm shadow-amber-500/20">
                      {pendingCount} pending
                    </Badge>
                  )}
                  <ArrowRight className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/advisor/directory">
          <Card className="group h-full cursor-pointer transition-all hover:bg-surface-low">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2F8CD9]/15 shadow-sm">
                    <Search className="h-5 w-5 text-[#2F8CD9]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">Find Producers</h3>
                    <p className="text-xs text-text-muted">Browse the producer directory</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-0.5" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Info note */}
      <Card className="bg-emerald-500/[0.03]">
        <CardContent className="flex items-start gap-3 p-4">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          <p className="text-xs leading-relaxed text-text-muted">
            You can view shared portfolio data but never modify a producer's records. Data access
            is controlled by each producer and can be revoked at any time.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
