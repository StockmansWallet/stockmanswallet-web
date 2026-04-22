// Shared chat detail page. Renders a conversation that another producer shared
// with the current user in the same chat-bubble layout as a live Brangus chat,
// so the recipient sees a native-looking transcript rather than a plain-text
// export. Read-only - no input bar.

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SharedChatDetailClient } from "@/components/app/brangus/shared-chat-detail-client";

export const metadata = { title: "Shared chat" };

export default async function SharedChatPage({
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

  const { data: row, error } = await supabase
    .from("brangus_shared_chats")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !row) notFound();

  // RLS already guards access, but we double-check here so we don't leak a 403 as a broken page.
  const isRecipient = row.recipient_user_id === user.id;
  const isSender = row.sender_user_id === user.id;
  if (!isRecipient && !isSender) notFound();
  if (isRecipient && row.is_deleted_by_recipient) notFound();
  if (isSender && row.is_deleted_by_sender) notFound();

  return <SharedChatDetailClient row={row} viewerIsRecipient={isRecipient} />;
}
