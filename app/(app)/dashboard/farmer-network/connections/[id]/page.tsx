import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { FarmerChatClient } from "./farmer-chat-client";
import { ModerationMenu } from "@/app/(app)/dashboard/farmer-network/directory/[id]/moderation-menu";
import { MarkConnectionNotificationsRead } from "@/components/app/mark-connection-notifications-read";
import { UserAvatar } from "@/components/app/user-avatar";
import { fetchUserAvatars } from "@/lib/auth/fetch-user-avatars";
import type { ConnectionRequest, AdvisoryMessage } from "@/lib/types/advisory";

export const metadata = {
  title: "Producer Chat",
};

export default async function FarmerConnectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: connection } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("id", id)
    .eq("connection_type", "farmer_peer")
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
  const avatarMap = await fetchUserAvatars([otherUserId]);
  const otherAvatarUrl = avatarMap.get(otherUserId) ?? null;

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
    [user.id]: { name: myProfile?.display_name ?? "You", role: "producer" },
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] max-w-4xl flex-col pb-4 pt-8">
      <MarkConnectionNotificationsRead connectionId={id} />
      {/* Header: avatar + name + company inline, moderation menu on the right. */}
      <div className="mb-4 flex items-center gap-3">
        <UserAvatar
          name={otherName}
          avatarUrl={otherAvatarUrl}
          sizeClass="h-12 w-12"
          initialClass="text-base font-bold"
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-text-primary">{otherName}</h1>
          {(otherProfile?.property_name || otherProfile?.company_name) && (
            <p className="truncate text-sm text-text-secondary">
              {otherProfile?.property_name ?? otherProfile?.company_name}
            </p>
          )}
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

      <Card className="flex min-h-0 flex-1 flex-col rounded-3xl">
        <CardContent className="flex min-h-0 flex-1 flex-col px-5 pb-5 pt-5">
          <FarmerChatClient
            connectionId={id}
            currentUserId={user.id}
            messages={(messages ?? []) as AdvisoryMessage[]}
            participants={participants}
          />
        </CardContent>
      </Card>
    </div>
  );
}
