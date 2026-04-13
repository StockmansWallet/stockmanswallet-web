import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationType } from "@/lib/types/advisory";

interface NotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  connectionId?: string;
}

export async function createNotification(
  supabase: SupabaseClient,
  params: NotificationParams
) {
  // Dedup for new_message is handled inside the create_notification SQL function
  // (SECURITY DEFINER context can see all rows regardless of RLS).
  const { error: rpcError } = await supabase.rpc("create_notification", {
    p_user_id: params.userId,
    p_type: params.type,
    p_title: params.title,
    p_body: params.body ?? null,
    p_link: params.link ?? null,
    p_related_connection_id: params.connectionId ?? null,
  });

  if (rpcError) {
    console.error("create_notification RPC failed:", rpcError.message);
  }

  // Fire APNs push notification (best-effort, don't block on failure)
  sendPushNotification(params).catch((err) => {
    console.error("Push notification failed:", err);
  });
}

// Debug: Call the send-push-notification Edge Function to deliver APNs push.
// Uses service role key for server-to-server auth (the recipient is a different user).
async function sendPushNotification(params: NotificationParams) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return;

  const res = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      user_id: params.userId,
      title: params.title,
      body: params.body ?? undefined,
      data: {
        type: params.type,
        link: params.link ?? undefined,
        connection_id: params.connectionId ?? undefined,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`send-push-notification returned ${res.status}: ${body}`);
  }
}

// Direction-aware notification helpers.
// recipientRole determines which dashboard the link goes to:
// "producer" -> /dashboard/advisory-hub/my-advisors/{id}
// "advisor"  -> /dashboard/advisor/clients/{id}
function linkForRole(role: "producer" | "advisor", connectionId: string): string {
  return role === "producer"
    ? `/dashboard/advisory-hub/my-advisors/${connectionId}`
    : `/dashboard/advisor/clients/${connectionId}`;
}

export async function notifyConnectionRequest(
  supabase: SupabaseClient,
  recipientUserId: string,
  senderName: string,
  connectionId: string,
  recipientRole: "producer" | "advisor" = "producer"
) {
  await createNotification(supabase, {
    userId: recipientUserId,
    type: "new_connection_request",
    title: `${senderName} wants to connect`,
    body: "Review and accept or decline this connection request.",
    link: linkForRole(recipientRole, connectionId),
    connectionId,
  });
}

export async function notifyApproval(
  supabase: SupabaseClient,
  recipientUserId: string,
  approverName: string,
  connectionId: string,
  recipientRole: "producer" | "advisor" = "advisor"
) {
  await createNotification(supabase, {
    userId: recipientUserId,
    type: "request_approved",
    title: `${approverName} accepted your connection`,
    body: "You are now connected and can view shared data.",
    link: linkForRole(recipientRole, connectionId),
    connectionId,
  });
}

export async function notifyDenial(
  supabase: SupabaseClient,
  recipientUserId: string,
  declinerName: string,
  connectionId: string,
  recipientRole: "producer" | "advisor" = "advisor"
) {
  await createNotification(supabase, {
    userId: recipientUserId,
    type: "request_denied",
    title: `${declinerName} declined your request`,
    link: linkForRole(recipientRole, connectionId),
    connectionId,
  });
}

export async function notifyNewMessage(
  supabase: SupabaseClient,
  recipientUserId: string,
  senderName: string,
  connectionId: string,
  recipientRole: "producer" | "advisor"
) {
  await createNotification(supabase, {
    userId: recipientUserId,
    type: "new_message",
    title: `New message from ${senderName}`,
    link: linkForRole(recipientRole, connectionId),
    connectionId,
  });
}

export async function notifyRenewalRequested(
  supabase: SupabaseClient,
  recipientUserId: string,
  requesterName: string,
  connectionId: string,
  recipientRole: "producer" | "advisor" = "producer"
) {
  await createNotification(supabase, {
    userId: recipientUserId,
    type: "renewal_requested",
    title: `${requesterName} requested data access`,
    body: "Review and grant access to share your portfolio data.",
    link: linkForRole(recipientRole, connectionId),
    connectionId,
  });
}

export async function notifyFarmerConnectionRequest(
  supabase: SupabaseClient,
  toUserId: string,
  fromName: string,
  connectionId: string
) {
  await createNotification(supabase, {
    userId: toUserId,
    type: "farmer_connection_request",
    title: `${fromName} wants to connect`,
    body: "Review and accept or decline this connection request.",
    link: "/dashboard/farmer-network/connections",
    connectionId,
  });
}

export async function notifyFarmerRequestApproved(
  supabase: SupabaseClient,
  toUserId: string,
  fromName: string,
  connectionId: string
) {
  await createNotification(supabase, {
    userId: toUserId,
    type: "farmer_request_approved",
    title: `${fromName} accepted your connection`,
    body: "You can now chat with each other.",
    link: `/dashboard/farmer-network/connections/${connectionId}`,
    connectionId,
  });
}
