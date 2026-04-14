import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ConnectionRealtime } from "@/components/app/advisory/connection-realtime";
import { ClientCard } from "@/components/app/advisory/client-card";
import { PendingRequestCard } from "@/components/app/advisory/pending-request-card";
import { ClientSearch } from "./client-search";
import { hasActivePermission, type ConnectionRequest } from "@/lib/types/advisory";
import {
  Users,
  Shield,
  UserCheck,
  Clock,
} from "lucide-react";

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

  // Advisory connections only (exclude farmer_peer)
  const { data: connections } = await supabase
    .from("connection_requests")
    .select("*")
    .or(`requester_user_id.eq.${user.id},target_user_id.eq.${user.id}`)
    .eq("connection_type", "advisory")
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: false });

  const allConnections = (connections ?? []) as ConnectionRequest[];

  // Get client profiles for display names
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
  const incomingRequests = allConnections.filter(
    (c) => c.status === "pending" && c.target_user_id === user.id
  );
  const outgoingPending = allConnections.filter(
    (c) => c.status === "pending" && c.requester_user_id === user.id
  );
  const approvedConnections = allConnections.filter((c) => c.status === "approved");
  const sharingCount = approvedConnections.filter((c) => hasActivePermission(c)).length;
  const pendingCount = incomingRequests.length + outgoingPending.length;
  const hasAnything = incomingRequests.length > 0 || outgoingPending.length > 0 || approvedConnections.length > 0;

  return (
    <div className="max-w-5xl">
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
              <p className="text-2xl font-bold text-text-primary">{approvedConnections.length}</p>
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

      <ClientSearch />

      {!hasAnything && (
        <Card>
          <EmptyState
            icon={<Users className="h-6 w-6 text-[#2F8CD9]" />}
            title="No clients yet"
            description="Browse the producer directory to connect with farmers and graziers."
            actionLabel="Find Producers"
            actionHref="/dashboard/advisor/directory"
            variant="advisor"
          />
        </Card>
      )}

      {/* Incoming requests from producers (Accept/Decline) */}
      {incomingRequests.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-amber-400">
            Incoming Requests ({incomingRequests.length})
          </h2>
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
          <h2 className="mb-3 text-sm font-semibold text-text-secondary">
            Awaiting Response ({outgoingPending.length})
          </h2>
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
      {approvedConnections.length > 0 && (
        <div className="mb-6">
          {(incomingRequests.length > 0 || outgoingPending.length > 0) && (
            <h2 className="mb-3 text-sm font-semibold text-text-secondary">
              Connected Clients ({approvedConnections.length})
            </h2>
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
      )}

      {/* Info note */}
      <Card className="bg-emerald-500/[0.03]">
        <CardContent className="flex items-start gap-3 p-4">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          <p className="text-xs leading-relaxed text-text-muted">
            You can view shared portfolio data but never modify a producer&apos;s records. Data access
            is controlled by each producer and can be revoked at any time.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
