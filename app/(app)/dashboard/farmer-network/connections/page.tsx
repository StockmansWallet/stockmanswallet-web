import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Handshake, UserCheck, Clock, Users2 } from "lucide-react";
import { FarmerRequestCard } from "@/components/app/farmer-network/farmer-request-card";
import { FarmerPeerCard } from "@/components/app/farmer-network/farmer-peer-card";
import { FarmerProducerSearch } from "@/components/app/farmer-network/farmer-producer-search";
import { FarmerConnectionsRealtime } from "@/components/app/farmer-network/farmer-connections-realtime";
import { BroadcastButton } from "@/components/app/farmer-network/broadcast-button";
import type { ConnectionRequest } from "@/lib/types/advisory";

export const revalidate = 0;

export const metadata = {
  title: "My Connections",
};

export default async function FarmerConnectionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Every farmer_peer connection that involves this user, regardless of status.
  const { data: connections } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("connection_type", "farmer_peer")
    .or(`requester_user_id.eq.${user.id},target_user_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const allConns = (connections ?? []) as ConnectionRequest[];

  const incomingRequests = allConns.filter(
    (c) => c.status === "pending" && c.target_user_id === user.id,
  );
  const outgoingPending = allConns.filter(
    (c) => c.status === "pending" && c.requester_user_id === user.id,
  );
  const approved = allConns.filter((c) => c.status === "approved");

  const pendingCount = incomingRequests.length + outgoingPending.length;
  const hasAnything = incomingRequests.length > 0 || outgoingPending.length > 0 || approved.length > 0;

  // Resolve the other party for each connection.
  const otherIdFor = (c: ConnectionRequest) =>
    c.requester_user_id === user.id ? c.target_user_id : c.requester_user_id;
  const otherIds = Array.from(
    new Set([...approved.map(otherIdFor), ...outgoingPending.map(otherIdFor)]),
  );

  const profileMap = new Map<string, { display_name: string; company_name: string | null; state: string | null; region: string | null }>();
  if (otherIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, company_name, state, region")
      .in("user_id", otherIds);
    for (const p of profiles ?? []) {
      profileMap.set(p.user_id, {
        display_name: p.display_name,
        company_name: p.company_name,
        state: p.state,
        region: p.region,
      });
    }
  }

  // Last chat message per approved connection for the card subtitle.
  const lastMessages = new Map<string, string>();
  if (approved.length > 0) {
    const connIds = approved.map((c) => c.id);
    const { data: messages } = await supabase
      .from("advisory_messages")
      .select("connection_id, content, created_at")
      .in("connection_id", connIds)
      .order("created_at", { ascending: false });
    for (const m of messages ?? []) {
      if (!lastMessages.has(m.connection_id)) {
        lastMessages.set(m.connection_id, m.content);
      }
    }
  }

  return (
    <div className="max-w-4xl">
      <FarmerConnectionsRealtime userId={user.id} />
      <PageHeader
        title="My Connections"
        titleClassName="text-4xl font-bold text-orange-400"
        titleHref="/dashboard/farmer-network"
        subtitle="Manage your producer connections"
        subtitleClassName="text-sm font-medium text-text-secondary"
      />

      {/* Stats row: Connected and Pending only. Peer connections have no
          sharing dimension, so a third stat would just be filler. */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/10">
              <UserCheck className="h-5 w-5 text-success" aria-hidden="true" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{approved.length}</p>
              <p className="text-[11px] text-text-muted">Connected</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-400" aria-hidden="true" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
              <p className="text-[11px] text-text-muted">Pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <FarmerProducerSearch />

      {!hasAnything && (
        <Card>
          <EmptyState
            icon={<Users2 className="h-6 w-6 text-orange-400" />}
            title="No connections yet"
            description="Search above, or browse the full directory to find other producers."
            actionLabel="Browse Directory"
            actionHref="/dashboard/farmer-network/directory"
            variant="amber"
          />
        </Card>
      )}

      {incomingRequests.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-amber-400">
            Incoming Requests ({incomingRequests.length})
          </h2>
          <div className="flex flex-col gap-3">
            {incomingRequests.map((req) => (
              <FarmerRequestCard key={req.id} request={req} />
            ))}
          </div>
        </div>
      )}

      {outgoingPending.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-text-secondary">
            Awaiting Response ({outgoingPending.length})
          </h2>
          <div className="flex flex-col gap-3">
            {outgoingPending.map((c) => {
              const otherId = otherIdFor(c);
              const profile = profileMap.get(otherId);
              return (
                <FarmerPeerCard
                  key={c.id}
                  href={`/dashboard/farmer-network/directory/${otherId}`}
                  name={profile?.display_name ?? c.requester_name}
                  company={profile?.company_name}
                  state={profile?.state}
                  region={profile?.region}
                  status="pending"
                />
              );
            })}
          </div>
        </div>
      )}

      {approved.length > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            {(incomingRequests.length > 0 || outgoingPending.length > 0) ? (
              <h2 className="text-sm font-semibold text-text-secondary">
                Connected ({approved.length})
              </h2>
            ) : (
              <span />
            )}
            {approved.length >= 2 && <BroadcastButton recipientCount={approved.length} />}
          </div>
          <div className="flex flex-col gap-3">
            {approved.map((c) => {
              const otherId = otherIdFor(c);
              const profile = profileMap.get(otherId);
              return (
                <FarmerPeerCard
                  key={c.id}
                  href={`/dashboard/farmer-network/connections/${c.id}`}
                  name={profile?.display_name ?? c.requester_name}
                  company={profile?.company_name}
                  state={profile?.state}
                  region={profile?.region}
                  status="approved"
                  lastMessage={lastMessages.get(c.id)}
                  connectedSince={c.permission_granted_at ?? c.created_at}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Orange-tinted info footer - reinforces the peer-chat purpose. */}
      <Card className="bg-orange-500/[0.03]">
        <CardContent className="flex items-start gap-3 p-4">
          <Handshake className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-text-muted">
            Connect with other producers to share insights and chat directly. You can disconnect at any time, and no portfolio data is shared unless you choose to attach it to a message.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
