import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Clock, Handshake, MessageCircle, Search, UserCheck, Users2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { ProducerRequestCard } from "@/components/app/ch40/producer-request-card";
import { ProducerConversationRemoveButton } from "@/components/app/ch40/producer-conversation-remove-button";
import { ProducerFindPanel } from "@/components/app/ch40/producer-find-panel";
import { ProducerConnectButton } from "@/components/app/ch40/producer-connect-button";
import { ProducerConnectionsRealtime } from "@/components/app/ch40/producer-connections-realtime";
import { MarkNotificationsRead } from "@/components/app/mark-notifications-read";
import { MarkConnectionNotificationsRead } from "@/components/app/mark-connection-notifications-read";
import { AnimatedUnreadPill } from "@/components/app/animated-unread-pill";
import { UserAvatar } from "@/components/app/user-avatar";
import { createClient } from "@/lib/supabase/server";
import { fetchUserAvatars } from "@/lib/auth/fetch-user-avatars";
import { ModerationMenu } from "@/app/(app)/dashboard/ch40/directory/[id]/moderation-menu";
import { ProducerChatClient } from "@/app/(app)/dashboard/ch40/connections/[id]/producer-chat-client";
import type { AdvisoryMessage, ConnectionRequest } from "@/lib/types/advisory";

interface ProducerNetworkHubProps {
  selectedConnectionId?: string;
  selectedPendingConnectionId?: string;
  mode?: "find";
}

interface ProducerProfileSummary {
  display_name: string;
  company_name: string | null;
  property_name: string | null;
  state: string | null;
  region: string | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export async function ProducerNetworkHub({
  selectedConnectionId,
  selectedPendingConnectionId,
  mode,
}: ProducerNetworkHubProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: connections } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("connection_type", "producer_peer")
    .or(`requester_user_id.eq.${user.id},target_user_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const allConns = (connections ?? []) as ConnectionRequest[];
  const incomingRequests = allConns.filter(
    (c) => c.status === "pending" && c.target_user_id === user.id
  );
  const outgoingPending = allConns.filter(
    (c) => c.status === "pending" && c.requester_user_id === user.id
  );
  const approved = allConns.filter((c) => c.status === "approved");
  const pendingCount = incomingRequests.length + outgoingPending.length;

  const selectedConnection = selectedConnectionId
    ? approved.find((c) => c.id === selectedConnectionId)
    : null;
  if (selectedConnectionId && !selectedConnection) notFound();
  const selectedPendingConnection = selectedPendingConnectionId
    ? outgoingPending.find((c) => c.id === selectedPendingConnectionId)
    : null;

  const otherIdFor = (c: ConnectionRequest) =>
    c.requester_user_id === user.id ? c.target_user_id : c.requester_user_id;

  const connectedAndPendingIds = Array.from(
    new Set([...approved.map(otherIdFor), ...outgoingPending.map(otherIdFor)])
  );
  const avatarIds = Array.from(
    new Set([
      user.id,
      ...connectedAndPendingIds,
      ...incomingRequests.map((r) => r.requester_user_id),
    ])
  );

  const profileIds = Array.from(
    new Set([...connectedAndPendingIds, ...incomingRequests.map((r) => r.requester_user_id)])
  );
  const profileMap = new Map<string, ProducerProfileSummary>();
  if (profileIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, company_name, property_name, state, region")
      .in("user_id", profileIds);
    for (const p of profiles ?? []) {
      profileMap.set(p.user_id, {
        display_name: p.display_name,
        company_name: p.company_name,
        property_name: p.property_name,
        state: p.state,
        region: p.region,
      });
    }
  }

  const lastMessages = new Map<string, { content: string; createdAt: string }>();
  if (approved.length > 0) {
    const { data: messages } = await supabase
      .from("advisory_messages")
      .select("connection_id, content, created_at")
      .in(
        "connection_id",
        approved.map((c) => c.id)
      )
      .order("created_at", { ascending: false });
    for (const m of messages ?? []) {
      if (!lastMessages.has(m.connection_id)) {
        lastMessages.set(m.connection_id, { content: m.content, createdAt: m.created_at });
      }
    }
  }

  const unreadByConnection = new Map<string, number>();
  if (approved.length > 0) {
    const { data: notifRows } = await supabase
      .from("notifications")
      .select("related_connection_id")
      .eq("user_id", user.id)
      .eq("type", "new_message")
      .eq("is_read", false)
      .in(
        "related_connection_id",
        approved.map((c) => c.id)
      );
    for (const n of notifRows ?? []) {
      if (!n.related_connection_id) continue;
      unreadByConnection.set(
        n.related_connection_id,
        (unreadByConnection.get(n.related_connection_id) ?? 0) + 1
      );
    }
  }

  const sortedApproved = [...approved].sort((a, b) => {
    const at = lastMessages.get(a.id)?.createdAt ?? a.permission_granted_at ?? a.created_at;
    const bt = lastMessages.get(b.id)?.createdAt ?? b.permission_granted_at ?? b.created_at;
    return new Date(bt).getTime() - new Date(at).getTime();
  });

  const avatarMap = await fetchUserAvatars(avatarIds);

  const { data: myProfile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();

  let selectedMessages: AdvisoryMessage[] = [];
  let selectedAlreadyBlocked = false;
  const selectedOtherId = selectedConnection ? otherIdFor(selectedConnection) : null;
  const selectedOtherProfile = selectedOtherId ? profileMap.get(selectedOtherId) : null;
  const selectedOtherName =
    selectedOtherProfile?.display_name ?? selectedConnection?.requester_name ?? "Producer";
  const selectedOtherCompany =
    selectedOtherProfile?.property_name ?? selectedOtherProfile?.company_name ?? null;

  if (selectedConnection && selectedOtherId) {
    const { data: messages } = await supabase
      .from("advisory_messages")
      .select("*")
      .eq("connection_id", selectedConnection.id)
      .order("created_at", { ascending: true });
    selectedMessages = (messages ?? []) as AdvisoryMessage[];

    const { data: blockRows } = await supabase
      .from("user_blocks")
      .select("id")
      .eq("blocker_user_id", user.id)
      .eq("blocked_user_id", selectedOtherId)
      .limit(1);
    selectedAlreadyBlocked = (blockRows?.length ?? 0) > 0;
  }

  const myName = myProfile?.display_name ?? "You";
  const initialsFrom = (name: string) => (name.trim().charAt(0) || "?").toUpperCase();
  const chatAvatars: Record<string, { url?: string | null; initials?: string }> = selectedOtherId
    ? {
        [selectedOtherId]: {
          url: avatarMap.get(selectedOtherId) ?? null,
          initials: initialsFrom(selectedOtherName),
        },
        [user.id]: {
          url: avatarMap.get(user.id) ?? null,
          initials: initialsFrom(myName),
        },
      }
    : {};
  const participants = selectedOtherId
    ? {
        [selectedOtherId]: { name: selectedOtherName, role: "producer" },
        [user.id]: { name: myName, role: "producer" },
      }
    : {};

  return (
    <div className="w-full max-w-[1680px]">
      <ProducerConnectionsRealtime userId={user.id} />
      <MarkNotificationsRead types={["new_connection_request"]} />
      {selectedConnectionId && (
        <MarkConnectionNotificationsRead connectionId={selectedConnectionId} />
      )}
      <PageHeader
        feature="ch40"
        title="Ch 40"
        subtitle="The Producer Channel - tune in and chat with other producers"
        titleClassName="text-4xl font-bold text-ch40-light"
        subtitleClassName="text-sm font-medium text-text-secondary"
        actions={
          <Link
            href="/dashboard/ch40?panel=find"
            className={`inline-flex h-8 items-center justify-center rounded-full px-4 text-[13px] font-semibold transition-colors ${
              mode === "find"
                ? "bg-ch40 text-white"
                : "bg-surface-high text-text-secondary hover:bg-surface-raised"
            }`}
          >
            <Search className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Find Producers
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
        <section
          className={`min-w-0 ${selectedConnection || mode === "find" || selectedPendingConnection ? "order-1" : "order-2 lg:order-1"}`}
        >
          <div className="relative flex h-[calc(100vh-19rem)] min-h-[34rem] flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] bg-clip-padding sm:h-[calc(100vh-17rem)] lg:h-[calc(100vh-7.5rem)]">
            {mode === "find" ? (
              <ProducerFindPanel />
            ) : selectedConnection && selectedOtherId ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <ProducerChatClient
                  connectionId={selectedConnection.id}
                  currentUserId={user.id}
                  messages={selectedMessages}
                  participants={participants}
                  avatars={chatAvatars}
                  header={
                    <div className="flex min-h-[5.25rem] [transform:translateZ(0)] items-center justify-between gap-4 border-b border-white/[0.08] bg-white/[0.06] bg-clip-padding px-5 py-4 backdrop-blur-2xl backdrop-saturate-150 [backface-visibility:hidden]">
                      <div className="flex min-w-0 items-center gap-3">
                        <Link
                          href={`/dashboard/ch40/directory/${selectedOtherId}`}
                          aria-label={`View ${selectedOtherName}'s profile`}
                          className="shrink-0"
                        >
                          <UserAvatar
                            name={selectedOtherName}
                            avatarUrl={avatarMap.get(selectedOtherId) ?? null}
                            sizeClass="h-12 w-12"
                          />
                        </Link>
                        <div className="min-w-0">
                          <h2 className="text-text-primary truncate text-lg font-semibold">
                            {selectedOtherName}
                          </h2>
                          {selectedOtherCompany && (
                            <p className="text-text-secondary mt-0.5 truncate text-sm">
                              {selectedOtherCompany}
                            </p>
                          )}
                        </div>
                      </div>
                      <ModerationMenu
                        targetUserId={selectedOtherId}
                        targetName={selectedOtherName}
                        alreadyBlocked={selectedAlreadyBlocked}
                        connectionIdForDisconnect={selectedConnection.id}
                      />
                    </div>
                  }
                />
              </div>
            ) : selectedPendingConnection ? (
              <PendingProducerPanel
                connection={selectedPendingConnection}
                currentUserId={user.id}
                profile={profileMap.get(otherIdFor(selectedPendingConnection))}
                avatarUrl={avatarMap.get(otherIdFor(selectedPendingConnection)) ?? null}
              />
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center px-6">
                <EmptyState
                  icon={<MessageCircle className="text-ch40 h-6 w-6" />}
                  title="Select a conversation"
                  description="Choose a producer from the conversations rail to open the chat here."
                  actionLabel="Find Producers"
                  actionHref="/dashboard/ch40?panel=find"
                  variant="ch40"
                />
              </div>
            )}
          </div>
        </section>

        <aside
          className={`min-w-0 ${selectedConnection || mode === "find" || selectedPendingConnection ? "order-2" : "order-1 lg:order-2"}`}
        >
          <Card className="flex h-auto flex-col overflow-hidden rounded-3xl lg:h-[calc(100vh-7.5rem)]">
            <div className="relative min-h-0 flex-1">
              <CardContent className="absolute inset-0 overflow-y-auto p-0 pt-[5.25rem]">
                {incomingRequests.length > 0 && (
                  <div className="border-b border-white/[0.06] p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-warning text-xs font-semibold">Incoming Requests</p>
                      <span className="bg-warning/10 text-warning rounded-full px-2 py-0.5 text-[10px] font-semibold">
                        {incomingRequests.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {incomingRequests.map((req) => (
                        <ProducerRequestCard
                          key={req.id}
                          request={req}
                          avatarUrl={avatarMap.get(req.requester_user_id) ?? null}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {sortedApproved.length > 0 ? (
                  <div className="space-y-2 p-3">
                    {sortedApproved.map((c) => {
                      const otherId = otherIdFor(c);
                      const profile = profileMap.get(otherId);
                      const name = profile?.display_name ?? c.requester_name;
                      const company = profile?.property_name ?? profile?.company_name;
                      const lastMessage = lastMessages.get(c.id);
                      const unreadCount = unreadByConnection.get(c.id) ?? 0;
                      const hasUnread = unreadCount > 0;
                      const active = c.id === selectedConnectionId;
                      const lastActivity =
                        lastMessage?.createdAt ?? c.permission_granted_at ?? c.created_at;

                      return (
                        <div
                          key={c.id}
                          className={`group relative flex min-h-[4.875rem] items-center gap-3 rounded-xl p-3 transition-colors ${
                            active
                              ? "bg-ch40/15"
                              : "bg-white/[0.03] hover:bg-white/[0.05]"
                          }`}
                        >
                          <Link
                            href={`/dashboard/ch40/connections/${c.id}`}
                            aria-current={active ? "page" : undefined}
                            aria-label={`Open chat with ${name}`}
                            className="absolute inset-0 z-0"
                          />
                          <div className="relative shrink-0">
                            <UserAvatar
                              name={name}
                              avatarUrl={avatarMap.get(otherId) ?? null}
                              sizeClass="h-10 w-10"
                            />
                            <AnimatedUnreadPill
                              count={active ? 0 : unreadCount}
                              className="-top-1 -right-1 h-4 min-w-4 px-1 text-[10px]"
                            />
                          </div>
                          <div className="pointer-events-none relative z-10 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <p
                                className={`truncate text-sm ${hasUnread && !active ? "text-text-primary font-bold" : "text-text-primary font-semibold"}`}
                              >
                                {name}
                              </p>
                              {company && (
                                <span className="text-text-secondary truncate text-xs">
                                  {company}
                                </span>
                              )}
                            </div>
                            {lastMessage ? (
                              <p
                                className={`mt-1 flex items-center gap-1 truncate text-xs ${hasUnread && !active ? "text-text-secondary font-medium" : "text-text-muted"}`}
                              >
                                <MessageCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                                <span className="truncate">{lastMessage.content}</span>
                              </p>
                            ) : (
                              <p className="text-text-muted mt-1 text-xs">No messages yet</p>
                            )}
                          </div>
                          <div className="relative z-10 flex shrink-0 items-center gap-2">
                            <span className="text-text-muted text-xs">{timeAgo(lastActivity)}</span>
                            <ProducerConversationRemoveButton
                              connectionId={c.id}
                              targetName={name}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Users2 className="text-ch40-light h-6 w-6" />}
                    title="No conversations yet"
                    description="Find producers to start building your network."
                    actionLabel="Find Producers"
                    actionHref="/dashboard/ch40?panel=find"
                    variant="ch40"
                  />
                )}

                {outgoingPending.length > 0 && (
                  <div className="border-t border-white/[0.06] p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-text-secondary text-xs font-semibold">Awaiting Response</p>
                      <span className="text-text-secondary rounded-full border border-white/[0.08] bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold">
                        {outgoingPending.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {outgoingPending.map((c) => {
                        const otherId = otherIdFor(c);
                        const profile = profileMap.get(otherId);
                        const name = profile?.display_name ?? c.requester_name;
                        const company = profile?.property_name ?? profile?.company_name;
                        const active = selectedPendingConnectionId === c.id;

                        return (
                          <Link
                            key={c.id}
                            href={`/dashboard/ch40?pending=${c.id}`}
                            aria-current={active ? "page" : undefined}
                            className={`group flex min-h-[4.875rem] items-center gap-3 rounded-2xl border p-3 transition-colors ${
                              active
                                ? "border-ch40/20 bg-ch40/12"
                                : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05]"
                            }`}
                          >
                            <UserAvatar
                              name={name}
                              avatarUrl={avatarMap.get(otherId) ?? null}
                              sizeClass="h-10 w-10"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-text-primary truncate text-sm font-semibold">
                                {name}
                              </p>
                              {company && (
                                <p className="text-text-muted truncate text-xs">{company}</p>
                              )}
                            </div>
                            <Clock className="text-warning h-4 w-4" aria-hidden="true" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
              <div className="absolute inset-x-0 top-0 z-20 flex min-h-[5.25rem] [transform:translateZ(0)] items-center border-b border-white/[0.08] bg-white/[0.06] bg-clip-padding px-4 py-4 backdrop-blur-2xl backdrop-saturate-150 [backface-visibility:hidden]">
                <div className="flex w-full items-start justify-between gap-3">
                  <div>
                    <p className="text-text-primary text-base font-semibold">Conversations</p>
                    <p className="text-text-muted mt-0.5 text-sm">
                      {approved.length} connected producers
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="border-success/15 bg-success/10 text-success inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold">
                      <UserCheck className="h-3 w-3" aria-hidden="true" />
                      {approved.length}
                    </span>
                    {pendingCount > 0 && (
                      <span className="border-warning/15 bg-warning/10 text-warning inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {pendingCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-white/[0.06] p-3">
              <div className="border-ch40/10 bg-ch40/[0.04] flex items-start gap-2 rounded-2xl border p-3">
                <Handshake
                  className="text-ch40-light mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                <p className="text-text-muted text-[11px] leading-relaxed">
                  No portfolio data is shared unless you choose to attach it to a message.
                </p>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function PendingProducerPanel({
  connection,
  currentUserId,
  profile,
  avatarUrl,
}: {
  connection: ConnectionRequest;
  currentUserId: string;
  profile: ProducerProfileSummary | undefined;
  avatarUrl: string | null;
}) {
  const otherId =
    connection.requester_user_id === currentUserId
      ? connection.target_user_id
      : connection.requester_user_id;
  const name = profile?.display_name ?? connection.requester_name;
  const company = profile?.property_name ?? profile?.company_name ?? null;
  const location = [profile?.region, profile?.state].filter(Boolean).join(", ");

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="app-frosted-header relative z-10 flex min-h-[5.25rem] shrink-0 items-center border-b border-white/[0.06] px-5 py-4">
        <div className="flex w-full items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar name={name} avatarUrl={avatarUrl} sizeClass="h-12 w-12" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-text-primary truncate text-lg font-semibold">{name}</h2>
                <Badge variant="warning">Awaiting response</Badge>
              </div>
              {company && <p className="text-text-secondary mt-0.5 truncate text-sm">{company}</p>}
            </div>
          </div>
          <ProducerConnectButton
            targetUserId={otherId}
            existingStatus="pending"
            pendingRequestIdIfSent={connection.id}
          />
        </div>
      </div>

      <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center p-6">
        <div className="max-w-lg text-center">
          <div className="bg-warning/10 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full">
            <Clock className="text-warning h-7 w-7" aria-hidden="true" />
          </div>
          <p className="text-text-primary text-base font-semibold">Request sent</p>
          <p className="text-text-muted mt-2 text-sm leading-relaxed">
            {`${name} will move into Conversations once they accept your request. Until then, they'll stay in Awaiting Response on the right.`}
          </p>
          {location && <p className="text-text-secondary mt-4 text-xs font-medium">{location}</p>}
          <Link
            href="/dashboard/ch40?panel=find"
            className="border-ch40/20 bg-ch40/10 text-ch40 hover:bg-ch40/15 mt-5 inline-flex h-9 items-center justify-center rounded-full border px-4 text-[13px] font-semibold transition-colors"
          >
            <Search className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Find more producers
          </Link>
        </div>
      </div>
    </div>
  );
}
