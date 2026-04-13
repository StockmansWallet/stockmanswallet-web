import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { ConnectionChatClient } from "./connection-chat-client";
import { SharingPreferencesCard } from "@/components/app/advisory/sharing-preferences-card";
import { ConnectionRealtime } from "@/components/app/advisory/connection-realtime";
import {
  getCategoryConfig,
  hasActivePermission,
  parseSharingPermissions,
  type ConnectionRequest,
  type AdvisoryMessage,
} from "@/lib/types/advisory";

export const revalidate = 0;

export const metadata = {
  title: "Advisor Connection",
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
    .single();

  if (!connection) notFound();
  if (connection.target_user_id !== user.id && connection.requester_user_id !== user.id) notFound();

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("related_connection_id", id)
    .eq("is_read", false);

  const conn = connection as ConnectionRequest;
  const isActive = hasActivePermission(conn);

  const advisorUserId = conn.requester_user_id === user.id
    ? conn.target_user_id
    : conn.requester_user_id;

  const { data: advisorProfile } = await supabase
    .from("user_profiles")
    .select("display_name, role, company_name, state, region")
    .eq("user_id", advisorUserId)
    .single();

  const advisorName = advisorProfile?.display_name ?? conn.requester_name;
  const advisorRole = advisorProfile?.role ?? conn.requester_role;
  const categoryConfig = getCategoryConfig(advisorRole);
  const categoryBg = categoryConfig?.bgClass ?? "bg-[#2F8CD9]/15";
  const categoryColour = categoryConfig?.colorClass ?? "text-[#2F8CD9]";

  const connectedDate = new Date(conn.created_at).toLocaleDateString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
  });

  const { data: messages } = await supabase
    .from("advisory_messages")
    .select("*")
    .eq("connection_id", id)
    .order("created_at", { ascending: true });

  const { data: producerProfile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();

  const participants: Record<string, { name: string; role: string }> = {
    [advisorUserId]: { name: advisorName, role: advisorRole },
    [user.id]: { name: producerProfile?.display_name ?? "You", role: "producer" },
  };

  return (
    <div className="max-w-3xl">
      <ConnectionRealtime userId={user.id} />

      {/* Back link */}
      <Link
        href="/dashboard/advisory-hub/my-advisors"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text-secondary"
      >
        <ArrowLeft className="h-4 w-4" />
        My Advisors
      </Link>

      {/* Advisor header card */}
      <Card className="mb-6 overflow-hidden border border-white/5">
        <div className="bg-gradient-to-r from-white/[0.03] to-transparent p-5">
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${categoryBg} shadow-sm`}>
              {categoryConfig ? (
                <categoryConfig.icon className={`h-7 w-7 ${categoryColour}`} />
              ) : (
                <span className="text-lg font-bold text-[#2F8CD9]">{advisorName.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-text-primary">{advisorName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {categoryConfig && (
                  <Badge variant="default">{categoryConfig.label}</Badge>
                )}
                {advisorProfile?.company_name && (
                  <span className="text-sm text-text-muted">{advisorProfile.company_name}</span>
                )}
                <span className="text-sm text-text-muted">Connected {connectedDate}</span>
              </div>
            </div>
            <Badge variant={isActive ? "success" : "default"} className="shrink-0 text-sm">
              {isActive ? "Sharing" : "Not sharing"}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Sharing preferences */}
      <div className="mb-6">
        <SharingPreferencesCard
          connectionId={id}
          permissions={parseSharingPermissions(conn.sharing_permissions)}
          isActive={isActive}
        />
      </div>

      {/* Chat */}
      <Card className="border border-white/5">
        <CardHeader className="border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-[#2F8CD9]" />
            <CardTitle className="text-base">Chat with {advisorName}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="min-h-[400px] p-0">
          <div className="px-5 py-4">
            <ConnectionChatClient
              connectionId={id}
              currentUserId={user.id}
              messages={(messages ?? []) as AdvisoryMessage[]}
              participants={participants}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
