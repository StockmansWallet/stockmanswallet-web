import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { FarmerChatClient } from "./farmer-chat-client";
import type { ConnectionRequest, AdvisoryMessage } from "@/lib/types/advisory";

export const metadata = {
  title: "Farmer Chat",
};

export default async function FarmerConnectionDetailPage({
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
    .eq("connection_type", "farmer_peer")
    .eq("status", "approved")
    .single();

  if (!connection) notFound();

  const conn = connection as ConnectionRequest;
  const isRequester = conn.requester_user_id === user.id;
  const otherUserId = isRequester ? conn.target_user_id : conn.requester_user_id;

  // Fetch messages
  const { data: messages } = await supabase
    .from("advisory_messages")
    .select("*")
    .eq("connection_id", id)
    .order("created_at", { ascending: true });

  // Build participant map
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

  const participants: Record<string, { name: string; role: string }> = {
    [otherUserId]: {
      name: otherName,
      role: "farmer_grazier",
    },
    [user.id]: {
      name: myProfile?.display_name ?? "You",
      role: "farmer_grazier",
    },
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] max-w-3xl flex-col pb-4">
      <PageHeader
        title={otherName}
        titleClassName="text-4xl font-bold text-orange-400"
        titleHref="/dashboard/farmer-network/connections"
        subtitle="Back to Connections"
        subtitleClassName="text-sm font-medium text-text-secondary"
        inline
      />

      {otherProfile?.company_name && (
        <p className="mb-4 text-sm text-text-secondary">
          {otherProfile.company_name}
        </p>
      )}

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
