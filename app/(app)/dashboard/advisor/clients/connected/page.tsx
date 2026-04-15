import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Users, Search } from "lucide-react";
import { ClientCard } from "@/components/app/advisory/client-card";
import { PendingRequestCard } from "@/components/app/advisory/pending-request-card";
import { ClientSearch } from "../client-search";
import { ConnectionRealtime } from "@/components/app/advisory/connection-realtime";
import { hasActivePermission, type ConnectionRequest } from "@/lib/types/advisory";

export const revalidate = 0;

export const metadata = {
  title: "My Clients",
};

export default async function ConnectedClientsPage() {
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

  const hasAnything = incomingRequests.length > 0 || outgoingPending.length > 0 || approvedConnections.length > 0;

  return (
    <div className="max-w-4xl">
      <ConnectionRealtime userId={user.id} />
      <PageHeader
        title="My Clients"
        titleClassName="text-4xl font-bold text-[#2F8CD9]"
        subtitle="Manage your client connections"
        subtitleClassName="text-sm font-medium text-text-secondary"
        actions={
          <Link href="/dashboard/advisor/directory">
            <Button variant="advisor" size="sm">
              <Search className="mr-1.5 h-3.5 w-3.5" />
              Find Producers
            </Button>
          </Link>
        }
      />

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
      {approvedConnections.length > 0 && (
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
      )}
    </div>
  );
}
