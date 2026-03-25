import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Users, Search } from "lucide-react";
import { AdvisorRequestCard } from "@/components/app/advisory/advisor-request-card";
import { ConnectedAdvisorCard } from "@/components/app/advisory/connected-advisor-card";
import type { ConnectionRequest } from "@/lib/types/advisory";

export const metadata = {
  title: "My Advisors",
};

export default async function MyAdvisorsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: connections } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("target_user_id", user.id)
    .order("created_at", { ascending: false });

  const pending = (connections ?? []).filter(
    (c: ConnectionRequest) => c.status === "pending"
  );
  const approved = (connections ?? []).filter(
    (c: ConnectionRequest) => c.status === "approved"
  );

  const hasConnections = pending.length > 0 || approved.length > 0;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="My Advisors"
        titleClassName="text-4xl font-bold text-[#2F8CD9]"
        titleHref="/dashboard/advisory-hub"
        subtitle="Manage your advisory connections"
        subtitleClassName="text-sm font-medium text-text-secondary"
        inline
        actions={
          <Link href="/dashboard/advisory-hub/directory">
            <Button variant="advisor" size="sm">
              <Search className="mr-1.5 h-3.5 w-3.5" />
              Find Advisors
            </Button>
          </Link>
        }
      />

      {!hasConnections && (
        <Card>
          <EmptyState
            icon={<Users className="h-6 w-6 text-[#2F8CD9]" />}
            title="No advisors yet"
            description="Browse the advisor directory to connect with your livestock agent, accountant, banker, or other advisors."
            actionLabel="Find Advisors"
            actionHref="/dashboard/advisory-hub/directory"
            variant="advisor"
          />
        </Card>
      )}

      {/* Pending requests */}
      {pending.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-3 text-sm font-semibold text-text-secondary">
            Pending Requests ({pending.length})
          </h3>
          <div className="space-y-3">
            {pending.map((request: ConnectionRequest) => (
              <AdvisorRequestCard key={request.id} request={request} />
            ))}
          </div>
        </div>
      )}

      {/* Active connections */}
      {approved.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-text-secondary">
            Connected Advisors ({approved.length})
          </h3>
          <div className="space-y-3">
            {approved.map((connection: ConnectionRequest) => (
              <ConnectedAdvisorCard key={connection.id} connection={connection} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
