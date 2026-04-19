import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Handshake, UserCheck, Clock, Users2, MapPin } from "lucide-react";
import { FarmerRequestCard } from "@/components/app/farmer-network/farmer-request-card";
import { FarmerPeerCard } from "@/components/app/farmer-network/farmer-peer-card";
import { FarmerProducerSearch } from "@/components/app/farmer-network/farmer-producer-search";
import { FarmerConnectionsRealtime } from "@/components/app/farmer-network/farmer-connections-realtime";
import { FarmerCard } from "@/components/app/farmer-network/farmer-card";
import { BroadcastButton } from "@/components/app/farmer-network/broadcast-button";
import { loadOutgoingBlocks } from "@/lib/data/user-blocks";
import type { ConnectionRequest, DirectoryFarmer } from "@/lib/types/advisory";

export const revalidate = 0;

export const metadata = {
  title: "Producer Network",
};

export default async function FarmerNetworkPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

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

  // Latest-message snippet and timestamp per approved connection. Messages
  // are fetched in a single descending pass; the first row per connection
  // is the newest, so we just skip subsequent rows for the same connection.
  const lastMessages = new Map<string, { content: string; createdAt: string }>();
  if (approved.length > 0) {
    const connIds = approved.map((c) => c.id);
    const { data: messages } = await supabase
      .from("advisory_messages")
      .select("connection_id, content, created_at")
      .in("connection_id", connIds)
      .order("created_at", { ascending: false });
    for (const m of messages ?? []) {
      if (!lastMessages.has(m.connection_id)) {
        lastMessages.set(m.connection_id, { content: m.content, createdAt: m.created_at });
      }
    }
  }

  // Unread new_message notifications bucketed by connection so each
  // conversation row can show its own red pill.
  const unreadByConnection = new Map<string, number>();
  if (approved.length > 0) {
    const { data: notifRows } = await supabase
      .from("notifications")
      .select("related_connection_id")
      .eq("user_id", user.id)
      .eq("type", "new_message")
      .eq("is_read", false)
      .in("related_connection_id", approved.map((c) => c.id));
    for (const n of notifRows ?? []) {
      if (!n.related_connection_id) continue;
      unreadByConnection.set(
        n.related_connection_id,
        (unreadByConnection.get(n.related_connection_id) ?? 0) + 1,
      );
    }
  }

  // Sort approved connections by most recent activity so the inbox
  // surfaces the last-touched thread at the top. Fall back to the
  // permission_granted_at or created_at stamp for brand-new
  // connections with no chat history yet.
  const sortedApproved = [...approved].sort((a, b) => {
    const at = lastMessages.get(a.id)?.createdAt ?? a.permission_granted_at ?? a.created_at;
    const bt = lastMessages.get(b.id)?.createdAt ?? b.permission_granted_at ?? b.created_at;
    return new Date(bt).getTime() - new Date(at).getTime();
  });

  // Discovery: producers in the caller's state, capped at 4, excluding
  // self and anyone with any existing peer history. Hidden entirely
  // when there are no leads to show.
  const { data: myProfile } = await supabase
    .from("user_profiles")
    .select("state")
    .eq("user_id", user.id)
    .maybeSingle();
  const myState = myProfile?.state ?? null;

  let nearbyProducers: DirectoryFarmer[] = [];
  if (myState) {
    const blockedIds = await loadOutgoingBlocks(supabase, user.id);
    const excludeIds = [
      user.id,
      ...allConns.map(otherIdFor),
      ...blockedIds,
    ];

    const { data: nearby } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, company_name, role, state, region, bio")
      .eq("role", "producer")
      .eq("state", myState)
      .not("user_id", "in", `(${excludeIds.join(",")})`)
      .order("display_name")
      .limit(4);

    nearbyProducers = (nearby ?? []) as DirectoryFarmer[];
  }

  return (
    <div className="max-w-4xl">
      <FarmerConnectionsRealtime userId={user.id} />
      <PageHeader feature="producer-network"
        title="Producer Network"
        titleClassName="text-4xl font-bold text-producer-network-light"
        subtitle="Connect and chat with other producers"
        subtitleClassName="text-sm font-medium text-text-secondary"
      />

      {/* Stats row: Connected and Pending. Mirrors the existing
          connections-page shape so the inbox reads the same everywhere. */}
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/10">
              <Clock className="h-5 w-5 text-warning" aria-hidden="true" />
            </div>
            <div>
              <p className="text-2xl font-bold text-warning">{pendingCount}</p>
              <p className="text-[11px] text-text-muted">Pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <FarmerProducerSearch />

      {/* First-run empty state only when the user has zero activity of
          any kind. Once they have a request or a connection, the
          relevant section carries the weight. */}
      {!hasAnything && (
        <Card className="mb-6">
          <EmptyState
            icon={<Users2 className="h-6 w-6 text-producer-network-light" />}
            title="No connections yet"
            description="Search above, or browse the full directory to find other producers."
            actionLabel="Browse Directory"
            actionHref="/dashboard/farmer-network/directory"
            variant="amber"
          />
        </Card>
      )}

      {/* Incoming requests sit at the top of the inbox when present.
          They're the most time-sensitive work on this page. */}
      {incomingRequests.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-warning">
            Incoming Requests ({incomingRequests.length})
          </h2>
          <div className="flex flex-col gap-3">
            {incomingRequests.map((req) => (
              <FarmerRequestCard key={req.id} request={req} />
            ))}
          </div>
        </div>
      )}

      {/* Conversations ordered by most recent activity. The row renders
          an unread pill on the avatar and bolds the name when there are
          unread notifications for that connection, so a landing-from-a-
          notification lands next to the thing that triggered it. */}
      {sortedApproved.length > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-secondary">
              Conversations ({sortedApproved.length})
            </h2>
            {sortedApproved.length >= 2 && <BroadcastButton recipientCount={sortedApproved.length} />}
          </div>
          <div className="flex flex-col gap-3">
            {sortedApproved.map((c) => {
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
                  lastMessage={lastMessages.get(c.id)?.content}
                  connectedSince={c.permission_granted_at ?? c.created_at}
                  unreadCount={unreadByConnection.get(c.id) ?? 0}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Outgoing pending: informational, no action required from the
          caller beyond waiting. Sits below the conversations so it
          doesn't distract from the primary content. */}
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

      {/* Discovery footer. Hidden if the user has no state on file or
          no same-state producers left to show. */}
      {nearbyProducers.length > 0 && myState && (
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <MapPin className="h-4 w-4 text-producer-network-light" aria-hidden="true" />
              In your region ({myState})
            </h2>
            <Link
              href={`/dashboard/farmer-network/directory?state=${encodeURIComponent(myState)}`}
              className="text-xs font-medium text-producer-network-light transition-colors hover:text-producer-network-light"
            >
              See all
            </Link>
          </div>
          <Card>
            <div className="divide-y divide-white/[0.06]">
              {nearbyProducers.map((p) => (
                <FarmerCard key={p.user_id} farmer={p} />
              ))}
            </div>
          </Card>
        </div>
      )}

      <Card className="bg-producer-network/[0.03]">
        <CardContent className="flex items-start gap-3 p-4">
          <Handshake className="mt-0.5 h-5 w-5 shrink-0 text-producer-network-light" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-text-muted">
            Connect with other producers to share insights and chat directly. You can disconnect at any time, and no portfolio data is shared unless you choose to attach it to a message.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
