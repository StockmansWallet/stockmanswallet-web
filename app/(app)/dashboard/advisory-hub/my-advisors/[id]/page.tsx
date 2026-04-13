import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { ChevronLeft } from "lucide-react";
import { ConnectionChatClient } from "./connection-chat-client";
import { SharingPreferencesCard } from "@/components/app/advisory/sharing-preferences-card";
import { ConnectionRealtime } from "@/components/app/advisory/connection-realtime";
import { ProducerAdvisorOverview } from "./producer-advisor-overview";
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
    .select("display_name, role, company_name, state, region, contact_email, contact_phone, bio, avatar_url")
    .eq("user_id", advisorUserId)
    .single();

  const advisorName = advisorProfile?.display_name ?? conn.requester_name;
  const advisorRole = advisorProfile?.role ?? conn.requester_role;
  const categoryConfig = getCategoryConfig(advisorRole);
  const advisorAvatarUrl = advisorProfile?.avatar_url as string | null;

  const initials = advisorName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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

      {/* Back nav */}
      <div className="pb-4 pt-6">
        <Link
          href="/dashboard/advisory-hub/my-advisors"
          className="inline-flex items-center gap-0.5 text-sm text-text-muted transition-colors hover:text-text-secondary"
        >
          <ChevronLeft className="h-4 w-4" />
          My Advisors
        </Link>
      </div>

      {/* Advisor header: avatar + name + badges */}
      <div className="mb-6 flex items-center gap-4">
        {advisorAvatarUrl ? (
          <Image
            src={advisorAvatarUrl}
            alt={advisorName}
            width={56}
            height={56}
            className="h-14 w-14 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#2F8CD9]/15">
            <span className="text-lg font-bold text-[#2F8CD9]">{initials}</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-text-primary">{advisorName}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {categoryConfig && (
              <Badge variant="default">{categoryConfig.label}</Badge>
            )}
            <Badge variant={isActive ? "success" : "default"}>
              {isActive ? "Sharing" : "Not sharing"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          {
            id: "overview",
            label: "Overview",
            content: (
              <ProducerAdvisorOverview
                advisorName={advisorName}
                advisorCompany={advisorProfile?.company_name}
                advisorState={advisorProfile?.state}
                advisorRegion={advisorProfile?.region}
                advisorBio={advisorProfile?.bio}
                advisorEmail={advisorProfile?.contact_email}
                advisorPhone={advisorProfile?.contact_phone}
                connectedDate={connectedDate}
                isActive={isActive}
                connectionId={id}
              />
            ),
          },
          {
            id: "sharing",
            label: "Sharing",
            content: (
              <SharingPreferencesCard
                connectionId={id}
                permissions={parseSharingPermissions(conn.sharing_permissions)}
                isActive={isActive}
              />
            ),
          },
          {
            id: "chat",
            label: "Chat",
            content: (
              <Card className="flex h-[500px] flex-col">
                <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
                  <ConnectionChatClient
                    connectionId={id}
                    currentUserId={user.id}
                    messages={(messages ?? []) as AdvisoryMessage[]}
                    participants={participants}
                  />
                </CardContent>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
