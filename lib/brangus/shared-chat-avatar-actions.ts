"use server";

import { createClient } from "@/lib/supabase/server";
import { fetchUserAvatars } from "@/lib/auth/fetch-user-avatars";

export async function fetchSharedChatAvatars(userIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || userIds.length === 0) return {};

  const requested = Array.from(new Set(userIds.filter(Boolean)));
  const { data: rows } = await supabase
    .from("brangus_shared_chats")
    .select("sender_user_id, recipient_user_id")
    .or(`sender_user_id.eq.${user.id},recipient_user_id.eq.${user.id}`);

  const allowed = new Set<string>();
  for (const row of rows ?? []) {
    if (row.sender_user_id === user.id) allowed.add(row.recipient_user_id);
    if (row.recipient_user_id === user.id) allowed.add(row.sender_user_id);
  }

  const safeIds = requested.filter((id) => allowed.has(id));
  const avatarMap = await fetchUserAvatars(safeIds);
  return Object.fromEntries(avatarMap.entries());
}
