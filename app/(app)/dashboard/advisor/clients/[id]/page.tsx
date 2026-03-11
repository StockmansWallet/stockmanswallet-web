import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { ClientOverview } from "@/components/app/advisory/client-overview";
import { AdvisorNotes } from "./advisor-notes";
import { EmptyState } from "@/components/ui/empty-state";
import { Lock, Wrench } from "lucide-react";
import type { ConnectionRequest, AdvisoryMessage } from "@/lib/types/advisory";

export const metadata = {
  title: "Client Detail",
};

export default async function ClientDetailPage({
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

  // Fetch the connection by ID
  const { data: connection } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (!connection) notFound();

  // Verify the current user is the advisor on this connection
  if (connection.requester_user_id !== user.id) {
    notFound();
  }

  // Mark any unread notifications for this connection as read
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("related_connection_id", id)
    .eq("is_read", false);

  const conn = connection as ConnectionRequest;

  // Get client display name
  const { data: clientProfile } = await supabase
    .from("user_profiles")
    .select("display_name, company_name")
    .eq("user_id", conn.target_user_id)
    .single();

  const clientName = clientProfile?.display_name ?? "Unknown Producer";

  // Fetch messages for Notes tab
  const { data: messages } = await supabase
    .from("advisory_messages")
    .select("*")
    .eq("connection_id", id)
    .order("created_at", { ascending: true });

  const participants: Record<string, { name: string; role: string }> = {
    [user.id]: { name: "You", role: conn.requester_role },
    [conn.target_user_id]: { name: clientName, role: "producer" },
  };

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={clientName}
        titleClassName="text-4xl font-bold text-purple-400"
        titleHref="/dashboard/advisor/clients"
        subtitle="Back to clients"
        subtitleClassName="text-sm font-medium text-text-secondary"
        inline
        actions={
          clientProfile?.company_name ? (
            <Badge variant="default">{clientProfile.company_name}</Badge>
          ) : undefined
        }
      />

      <Tabs
        tabs={[
          {
            id: "overview",
            label: "Overview",
            content: <ClientOverview connection={conn} />,
          },
          {
            id: "notes",
            label: "Notes",
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <AdvisorNotes
                    connectionId={id}
                    currentUserId={user.id}
                    messages={(messages ?? []) as AdvisoryMessage[]}
                    participants={participants}
                  />
                </CardContent>
              </Card>
            ),
          },
          {
            id: "lens",
            label: "Advisor Lens",
            content: (
              <Card>
                <EmptyState
                  icon={<Wrench className="h-6 w-6 text-purple-400" />}
                  title="Coming Soon"
                  description="The Advisor Lens will let you apply private valuation overlays, adjust assumptions, and save scenarios for this client."
                  variant="purple"
                />
              </Card>
            ),
          },
          {
            id: "documents",
            label: "Documents",
            content: (
              <Card>
                <EmptyState
                  icon={<Lock className="h-6 w-6 text-purple-400" />}
                  title="Coming Soon"
                  description="Shared documents from this producer will appear here. Documents are read-only and cannot be modified by advisors."
                  variant="purple"
                />
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
