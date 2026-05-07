"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { sendProducerMessage } from "@/app/(app)/dashboard/ch40/connections/[id]/actions";
import { fetchUserAvatars } from "@/lib/auth/fetch-user-avatars";
import { createClient } from "@/lib/supabase/server";
import type { ConnectionRequest, FileAttachment } from "@/lib/types/advisory";

const fileShareSchema = z.object({
  fileId: z.string().uuid(),
  connectionIds: z.array(z.string().uuid()).min(1).max(50),
});

interface Ch40ShareProfile {
  display_name: string | null;
  company_name: string | null;
  property_name: string | null;
  state: string | null;
  region: string | null;
}

export interface GloveboxCh40Recipient {
  connectionId: string;
  userId: string;
  name: string;
  company: string | null;
  location: string | null;
  avatarUrl: string | null;
}

export async function listGloveboxCh40Recipients(): Promise<{
  recipients: GloveboxCh40Recipient[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { recipients: [], error: "Not authenticated" };

  const { data: connections, error: connectionError } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("connection_type", "producer_peer")
    .eq("status", "approved")
    .or(`requester_user_id.eq.${user.id},target_user_id.eq.${user.id}`)
    .order("created_at", { ascending: false });
  if (connectionError) return { recipients: [], error: connectionError.message };

  const approved = (connections ?? []) as ConnectionRequest[];
  const otherIds = approved.map((connection) =>
    connection.requester_user_id === user.id
      ? connection.target_user_id
      : connection.requester_user_id
  );

  const profileMap = new Map<string, Ch40ShareProfile>();
  if (otherIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, company_name, property_name, state, region")
      .in("user_id", otherIds);

    for (const profile of profiles ?? []) {
      profileMap.set(profile.user_id as string, {
        display_name: (profile.display_name as string | null) ?? null,
        company_name: (profile.company_name as string | null) ?? null,
        property_name: (profile.property_name as string | null) ?? null,
        state: (profile.state as string | null) ?? null,
        region: (profile.region as string | null) ?? null,
      });
    }
  }

  const avatarMap = await fetchUserAvatars(otherIds);
  const recipients = approved.map((connection) => {
    const otherId =
      connection.requester_user_id === user.id
        ? connection.target_user_id
        : connection.requester_user_id;
    const profile = profileMap.get(otherId);
    const name = profile?.display_name ?? connection.requester_name ?? "Producer";
    const location = [profile?.region, profile?.state].filter(Boolean).join(", ") || null;

    return {
      connectionId: connection.id,
      userId: otherId,
      name,
      company: profile?.property_name ?? profile?.company_name ?? null,
      location,
      avatarUrl: avatarMap.get(otherId) ?? null,
    };
  });

  return { recipients };
}

export async function shareGloveboxFileToCh40(input: {
  fileId: string;
  connectionIds: string[];
}): Promise<{ success?: true; error?: string }> {
  const parsed = fileShareSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: file } = await supabase
    .from("glovebox_files")
    .select("id, title, original_filename, mime_type, size_bytes, kind")
    .eq("id", parsed.data.fileId)
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .maybeSingle();
  if (!file) return { error: "File not found or not yours to share" };

  const attachment: FileAttachment = {
    type: "file",
    file_id: file.id as string,
    title: (
      (file.title as string | null) ||
      (file.original_filename as string | null) ||
      "Glovebox file"
    ).slice(0, 200),
    mime_type: (file.mime_type as string | null) ?? null,
    size_bytes: (file.size_bytes as number | null) ?? null,
    kind: (file.kind as string | null) ?? null,
  };

  for (const connectionId of parsed.data.connectionIds) {
    const result = await sendProducerMessage(
      connectionId,
      `Shared ${attachment.title}`,
      "general_note",
      attachment
    );
    if (result.error) return { error: result.error };
  }

  revalidatePath("/dashboard/tools/files");
  revalidatePath("/dashboard/ch40");
  return { success: true };
}
