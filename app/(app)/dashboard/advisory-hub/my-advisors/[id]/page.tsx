import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConnectionNotes } from "./connection-notes";
import { SharingPreferencesCard } from "@/components/app/advisory/sharing-preferences-card";
import {
  getCategoryConfig,
  hasActivePermission,
  parseSharingPermissions,
  permissionTimeRemaining,
  type ConnectionRequest,
  type AdvisoryMessage,
} from "@/lib/types/advisory";

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

  if (!connection || connection.target_user_id !== user.id) notFound();

  // Mark any unread notifications for this connection as read
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("related_connection_id", id)
    .eq("is_read", false);

  const conn = connection as ConnectionRequest;
  const categoryConfig = getCategoryConfig(conn.requester_role);
  const isActive = hasActivePermission(conn);

  // Fetch messages
  const { data: messages } = await supabase
    .from("advisory_messages")
    .select("*")
    .eq("connection_id", id)
    .order("created_at", { ascending: true });

  // Build participant map
  const { data: advisorProfile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", conn.requester_user_id)
    .single();

  const { data: producerProfile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();

  const participants: Record<string, { name: string; role: string }> = {
    [conn.requester_user_id]: {
      name: advisorProfile?.display_name ?? conn.requester_name,
      role: conn.requester_role,
    },
    [user.id]: {
      name: producerProfile?.display_name ?? "You",
      role: "producer",
    },
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={conn.requester_name}
        titleClassName="text-4xl font-bold text-[#2F8CD9]"
        titleHref="/dashboard/advisory-hub/my-advisors"
        subtitle="Back to My Advisors"
        subtitleClassName="text-sm font-medium text-text-secondary"
        inline
        actions={
          <div className="flex items-center gap-2">
            {categoryConfig && (
              <Badge variant="default">{categoryConfig.label}</Badge>
            )}
            <Badge variant={isActive ? "success" : "warning"}>
              {isActive ? permissionTimeRemaining(conn) : "Expired"}
            </Badge>
          </div>
        }
      />


      <div className="mb-6">
        <SharingPreferencesCard
          connectionId={id}
          permissions={parseSharingPermissions(conn.sharing_permissions)}
          isActive={isActive}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <ConnectionNotes
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
