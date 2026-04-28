// ============================================
// SUPABASE EDGE FUNCTION: Get Chat Participant Avatars
// ============================================
// File: supabase/functions/get-chat-participant-avatars/index.ts
// Deploy: supabase functions deploy get-chat-participant-avatars
//
// Debug: Mirrors the web's fetchSharedChatAvatars server action so iOS can
// Debug: render avatars on the Shared and Sent chat lists. Avatars live in
// Debug: auth.users.user_metadata.avatar_url which RLS-scoped clients can't
// Debug: read, so this function uses the service role key after verifying
// Debug: the caller and confirming each requested user_id has a brangus_shared_chats
// Debug: link to the caller (caller is sender or recipient on a row with that user).
// Debug: This keeps the function from becoming a generic "look up any user's
// Debug: avatar by ID" oracle.
//
// Request:  POST { user_ids: string[] } with Authorization: Bearer <user JWT>
// Response: { avatars: Record<user_id, avatar_url | null> }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    // Debug: Use the anon-key client with the caller's JWT so auth.uid() resolves
    // to the signed-in user. We never trust user_ids from the body without scoping.
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return json({ error: "Invalid session" }, 401);
    }
    const callerId = userData.user.id;

    let body: { user_ids?: unknown };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    const requested = Array.isArray(body.user_ids)
      ? body.user_ids.filter((v): v is string => typeof v === "string" && v.length > 0)
      : [];
    if (requested.length === 0) {
      return json({ avatars: {} }, 200);
    }
    // Debug: Cap the request size so a misbehaving client can't ask for thousands
    // of admin lookups in one call. 100 covers any realistic Shared list page.
    const unique = Array.from(new Set(requested)).slice(0, 100);

    // Debug: Derive the set of user IDs the caller is allowed to ask about.
    // Allowed = anyone the caller has shared with, or anyone who has shared
    // with the caller, via brangus_shared_chats; plus anyone the caller has an
    // approved producer_peer connection_requests row with (Ch 40 peer chat).
    const [sharedChats, peerConnections] = await Promise.all([
      userClient
        .from("brangus_shared_chats")
        .select("sender_user_id, recipient_user_id")
        .or(`sender_user_id.eq.${callerId},recipient_user_id.eq.${callerId}`),
      userClient
        .from("connection_requests")
        .select("requester_user_id, target_user_id")
        .eq("connection_type", "producer_peer")
        .eq("status", "approved")
        .or(`requester_user_id.eq.${callerId},target_user_id.eq.${callerId}`),
    ]);
    if (sharedChats.error) {
      return json({ error: "Could not load shared chat scope" }, 500);
    }
    if (peerConnections.error) {
      return json({ error: "Could not load Ch 40 connection scope" }, 500);
    }

    const allowed = new Set<string>();
    for (const row of sharedChats.data ?? []) {
      if (row.sender_user_id === callerId && row.recipient_user_id) {
        allowed.add(row.recipient_user_id);
      }
      if (row.recipient_user_id === callerId && row.sender_user_id) {
        allowed.add(row.sender_user_id);
      }
    }
    for (const row of peerConnections.data ?? []) {
      if (row.requester_user_id === callerId && row.target_user_id) {
        allowed.add(row.target_user_id);
      }
      if (row.target_user_id === callerId && row.requester_user_id) {
        allowed.add(row.requester_user_id);
      }
    }
    const safeIds = unique.filter((id) => allowed.has(id));

    // Debug: Service role is needed to read user_metadata. We've already
    // restricted safeIds to the caller's chat counterparties.
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const avatars: Record<string, string | null> = {};
    await Promise.all(
      safeIds.map(async (id) => {
        try {
          const { data } = await adminClient.auth.admin.getUserById(id);
          const meta = data?.user?.user_metadata as Record<string, unknown> | undefined;
          const url = meta?.avatar_url;
          avatars[id] = typeof url === "string" && url.length > 0 ? url : null;
        } catch {
          avatars[id] = null;
        }
      }),
    );

    return json({ avatars }, 200);
  } catch (err) {
    console.error("get-chat-participant-avatars error", err);
    return json({ error: "Internal error" }, 500);
  }
});

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
