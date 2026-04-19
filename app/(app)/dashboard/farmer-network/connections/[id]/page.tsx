import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { FarmerChatClient } from "./farmer-chat-client";
import { ModerationMenu } from "@/app/(app)/dashboard/farmer-network/directory/[id]/moderation-menu";
import { MarkConnectionNotificationsRead } from "@/components/app/mark-connection-notifications-read";
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
    .select("display_name, company_name")
    .eq("user_id", otherUserId)
    .single();

  const { data: myProfile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();

  const otherName = otherProfile?.display_name ?? conn.requester_name;
  const initial = (otherName?.trim().charAt(0) || "?").toUpperCase();

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
    <div className="flex h-[calc(100vh-6rem)] max-w-4xl flex-col pb-4">
      <MarkConnectionNotificationsRead connectionId={id} />
      {/* Back pill - canonical ChevronLeft + bg-surface-lowest per CLAUDE.md */}
      <div className="mb-3 pt-4">
        <Link
          href="/dashboard/farmer-network"
          className="inline-flex items-center gap-1.5 rounded-lg bg-surface-lowest px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Producer Network
        </Link>
      </div>

      {/* Header: avatar + name + company inline, moderation menu on the right. */}
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-producer-network/15"
          aria-hidden="true"
        >
          <span className="text-base font-bold text-producer-network-light">{initial}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-text-primary">{otherName}</h1>
          {otherProfile?.company_name && (
            <p className="truncate text-sm text-text-secondary">{otherProfile.company_name}</p>
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
