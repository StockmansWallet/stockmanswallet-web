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
  await supabase.rpc("create_notification", {
    p_user_id: params.userId,
    p_type: params.type,
    p_title: params.title,
    p_body: params.body ?? null,
    p_link: params.link ?? null,
    p_related_connection_id: params.connectionId ?? null,
  });
}

export async function notifyConnectionRequest(
  supabase: SupabaseClient,
  producerUserId: string,
  advisorName: string,
  connectionId: string
) {
  await createNotification(supabase, {
    userId: producerUserId,
    type: "new_connection_request",
    title: `${advisorName} requested access`,
    body: "Review and approve or deny this connection request.",
    link: "/dashboard/advisory-hub/my-advisors",
    connectionId,
  });
}

export async function notifyApproval(
  supabase: SupabaseClient,
  advisorUserId: string,
  producerName: string,
  connectionId: string
) {
  await createNotification(supabase, {
    userId: advisorUserId,
    type: "request_approved",
    title: `${producerName} approved your request`,
    body: "You now have a 3-day access window to view their data.",
    link: `/dashboard/advisor/clients/${connectionId}`,
    connectionId,
  });
}

export async function notifyDenial(
  supabase: SupabaseClient,
  advisorUserId: string,
  producerName: string,
  connectionId: string
) {
  await createNotification(supabase, {
    userId: advisorUserId,
    type: "request_denied",
    title: `${producerName} denied your request`,
    link: "/dashboard/advisor/clients",
    connectionId,
  });
}

export async function notifyNewMessage(
  supabase: SupabaseClient,
  recipientUserId: string,
  senderName: string,
  connectionId: string,
  isAdvisorSender: boolean
) {
  const link = isAdvisorSender
    ? `/dashboard/advisory-hub/my-advisors/${connectionId}`
    : `/dashboard/advisor/clients/${connectionId}`;

  await createNotification(supabase, {
    userId: recipientUserId,
    type: "new_message",
    title: `New note from ${senderName}`,
    link,
    connectionId,
  });
}

export async function notifyRenewalRequested(
  supabase: SupabaseClient,
  producerUserId: string,
  advisorName: string,
  connectionId: string
) {
  await createNotification(supabase, {
    userId: producerUserId,
    type: "renewal_requested",
    title: `${advisorName} requested access renewal`,
    body: "Review and approve to grant another 3-day window.",
    link: "/dashboard/advisory-hub/my-advisors",
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
