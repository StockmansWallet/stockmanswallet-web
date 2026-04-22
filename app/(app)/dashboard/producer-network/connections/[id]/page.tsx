import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ProducerChatClient } from "./producer-chat-client";
import { ModerationMenu } from "@/app/(app)/dashboard/producer-network/directory/[id]/moderation-menu";
import { MarkConnectionNotificationsRead } from "@/components/app/mark-connection-notifications-read";
import { UserAvatar } from "@/components/app/user-avatar";
import { fetchUserAvatars } from "@/lib/auth/fetch-user-avatars";
import type { ConnectionRequest, AdvisoryMessage } from "@/lib/types/advisory";

export const metadata = {
  title: "Producer Chat",
};

export default async function ProducerConnectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: connection } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("id", id)
    .eq("connection_type", "producer_peer")
    .eq("status", "approved")
    .single();

  if (!connection) notFound();

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("related_connection_id", id)
    .eq("is_read", false);

  const conn = connection as ConnectionRequest;
  const isRequester = conn.requester_user_id === user.id;
  const otherUserId = isRequester ? conn.target_user_id : conn.requester_user_id;

  const { data: messages } = await supabase
    .from("advisory_messages")
    .select("*")
    .eq("connection_id", id)
    .order("created_at", { ascending: true });

  const { data: otherProfile } = await supabase
    .from("user_profiles")
    .select("display_name, company_name, property_name")
    .eq("user_id", otherUserId)
    .single();

  const { data: myProfile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();

  const otherName = otherProfile?.display_name ?? conn.requester_name;
  const myName = myProfile?.display_name ?? "You";
  const avatarMap = await fetchUserAvatars([otherUserId, user.id]);
  const otherAvatarUrl = avatarMap.get(otherUserId) ?? null;
  const myAvatarUrl = avatarMap.get(user.id) ?? null;

  const initialsFrom = (name: string) => (name.trim().charAt(0) || "?").toUpperCase();
  const chatAvatars: Record<string, { url?: string | null; initials?: string }> = {
    [otherUserId]: { url: otherAvatarUrl, initials: initialsFrom(otherName) },
    [user.id]: { url: myAvatarUrl, initials: initialsFrom(myName) },
  };

  // Is this peer blocked by the viewer? Show the block state inside the
  // moderation menu so they can toggle it without leaving the chat.
  const { data: blockRows } = await supabase
    .from("user_blocks")
    .select("id")
    .eq("blocker_user_id", user.id)
    .eq("blocked_user_id", otherUserId)
    .limit(1);
  const alreadyBlocked = (blockRows?.length ?? 0) > 0;

  const participants: Record<string, { name: string; role: string }> = {
    [otherUserId]: { name: otherName, role: "producer" },
    [user.id]: { name: myName, role: "producer" },
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] max-w-4xl flex-col pt-12 pb-10">
      <MarkConnectionNotificationsRead connectionId={id} />
      {/* Header sits at pt-8 from outer so the name has breathing room
          above it, and pb-2 below so the chat card sits close underneath. */}
      <div className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-4">
            <UserAvatar
              name={otherName}
              avatarUrl={otherAvatarUrl}
              sizeClass="h-12 w-12 shrink-0"
              initialClass="text-base font-bold"
            />
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-producer-network-light truncate text-4xl font-bold">
                {otherName}
              </h1>
              {(otherProfile?.property_name || otherProfile?.company_name) && (
                <p className="text-text-secondary truncate text-sm font-medium">
                  {otherProfile?.property_name ?? otherProfile?.company_name}
                </p>
              )}
            </div>
          </div>
          <div className="shrink-0">
            <ModerationMenu
              targetUserId={otherUserId}
              targetName={otherName}
              alreadyBlocked={alreadyBlocked}
              connectionIdForDisconnect={id}
            />
          </div>
        </div>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl">
        <ProducerChatClient
          connectionId={id}
          currentUserId={user.id}
          messages={(messages ?? []) as AdvisoryMessage[]}
          participants={participants}
          avatars={chatAvatars}
        />
      </Card>
    </div>
  );
}
