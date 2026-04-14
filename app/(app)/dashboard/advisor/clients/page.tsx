import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Users, Shield, Clock } from "lucide-react";
import { ClientCard } from "@/components/app/advisory/client-card";
import { PendingRequestCard } from "@/components/app/advisory/pending-request-card";
import { ClientSearch } from "./client-search";
import { ConnectionRealtime } from "@/components/app/advisory/connection-realtime";
import { hasActivePermission, type ConnectionRequest } from "@/lib/types/advisory";

export const revalidate = 0;

export const metadata = {
  title: "Clients",
};

export default async function AdvisorClientsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Fetch connections where current user is involved (advisor-initiated OR farmer-initiated)
  const { data: connections } = await supabase
    .from("connection_requests")
    .select("*")
    .or(`requester_user_id.eq.${user.id},target_user_id.eq.${user.id}`)
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: false });

  const allConnections = (connections ?? []) as ConnectionRequest[];

  // Get client (other party) profiles for display names
  const clientUserIds = allConnections.map((c) =>
    c.requester_user_id === user.id ? c.target_user_id : c.requester_user_id
  );
  let clientProfiles: Record<string, { display_name: string; company_name: string; state: string }> = {};

  if (clientUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, company_name, state")
      .in("user_id", clientUserIds);

    if (profiles) {
      for (const p of profiles) {
        clientProfiles[p.user_id] = p;
      }
    }
  }

  // Split by status and direction
  // Incoming: producer sent request TO this advisor (advisor is target) - show Accept/Decline
  const incomingRequests = allConnections.filter(
    (c) => c.status === "pending" && c.target_user_id === user.id
  );
  // Outgoing: advisor sent request, waiting for producer response - show "Pending" badge
  const outgoingPending = allConnections.filter(
    (c) => c.status === "pending" && c.requester_user_id === user.id
  );
  const approvedConnections = allConnections.filter((c) => c.status === "approved");

  // Stats
  const totalClients = allConnections.length;
  const activePermissions = approvedConnections.filter((c) => hasActivePermission(c)).length;
  const pendingRequests = incomingRequests.length + outgoingPending.length;

  return (
    <div className="max-w-4xl">
      <ConnectionRealtime userId={user.id} />
      <PageHeader
        title="Clients"
        titleClassName="text-4xl font-bold text-[#2F8CD9]"
        subtitle="Find and connect with producers"
        subtitleClassName="text-sm font-medium text-text-secondary"
        inline
      />

      <ClientSearch />

      {/* Stats row */}
      {totalClients > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2F8CD9]/10">
                <Users className="h-4 w-4 text-[#2F8CD9]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{totalClients}</p>
                <p className="text-[11px] text-text-muted">Total Clients</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <Shield className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">{activePermissions}</p>
                <p className="text-[11px] text-text-muted">Sharing</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                <Clock className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-400">{pendingRequests}</p>
                <p className="text-[11px] text-text-muted">Pending</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Incoming requests from producers (Accept/Decline) */}
      {incomingRequests.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-amber-400">
            Incoming Requests ({incomingRequests.length})
          </h3>
          <div className="flex flex-col gap-3">
            {incomingRequests.map((connection) => {
              const clientId = connection.requester_user_id;
              const profile = clientProfiles[clientId];
              return (
                <PendingRequestCard
                  key={connection.id}
                  connectionId={connection.id}
                  clientName={profile?.display_name ?? "Unknown Producer"}
                  clientCompany={profile?.company_name}
                  clientState={profile?.state}
                  createdAt={connection.created_at}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Outgoing requests awaiting producer response */}
      {outgoingPending.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-text-secondary">
            Awaiting Response ({outgoingPending.length})
          </h3>
          <div className="flex flex-col gap-3">
            {outgoingPending.map((connection) => {
              const clientId = connection.target_user_id;
              const profile = clientProfiles[clientId];
              return (
                <ClientCard
                  key={connection.id}
                  connection={connection}
                  clientName={profile?.display_name ?? "Unknown Producer"}
                  clientState={profile?.state}
                  clientCompany={profile?.company_name}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Connected clients */}
      {approvedConnections.length === 0 && incomingRequests.length === 0 && outgoingPending.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="h-6 w-6 text-[#2F8CD9]" />}
            title="No clients yet"
            description="When producers send you connection requests, they will appear here. You can also search for producers above."
            variant="advisor"
          />
        </Card>
      ) : approvedConnections.length > 0 ? (
        <div>
          {(incomingRequests.length > 0 || outgoingPending.length > 0) && (
            <h3 className="mb-3 text-sm font-semibold text-text-secondary">
              Connected Clients ({approvedConnections.length})
            </h3>
          )}
          <div className="flex flex-col gap-3">
            {approvedConnections.map((connection) => {
              const clientId =
                connection.requester_user_id === user.id
                  ? connection.target_user_id
                  : connection.requester_user_id;
              const profile = clientProfiles[clientId];
              return (
                <ClientCard
                  key={connection.id}
                  connection={connection}
                  clientName={profile?.display_name ?? "Unknown Producer"}
                  clientState={profile?.state}
                  clientCompany={profile?.company_name}
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
