import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Search,
  Shield,
  Lock,
  ArrowRight,
} from "lucide-react";

export const metadata = {
  title: "Advisory Hub",
};

export default async function AdvisoryHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Fetch connection counts for badges
  const { data: connections } = await supabase
    .from("connection_requests")
    .select("id, status")
    .eq("target_user_id", user.id)
    .eq("connection_type", "advisory");

  const pendingCount = connections?.filter((c) => c.status === "pending").length ?? 0;
  const activeCount = connections?.filter((c) => c.status === "approved").length ?? 0;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Advisory Hub"
        titleClassName="text-4xl font-bold text-[#2F8CD9]"
        subtitle="Connect with your advisory team"
        subtitleClassName="text-sm font-medium text-text-secondary"
        inline
      />

      {/* Hero section */}
      <Card className="mb-6 overflow-hidden">
        <div className="bg-gradient-to-br from-[#2F8CD9]/10 via-[#2F8CD9]/5 to-transparent p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#2F8CD9]/15">
              <Users className="h-6 w-6 text-[#2F8CD9]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                Your Advisory Team
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Securely share your portfolio data with trusted advisors.
                They can view your holdings and provide professional guidance
                without ever modifying your data.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Action cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Link href="/dashboard/advisory-hub/my-advisors">
          <Card className="group cursor-pointer transition-all hover:bg-surface-low">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2F8CD9]/15">
                    <Users className="h-5 w-5 text-[#2F8CD9]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">My Advisors</h3>
                    <p className="text-xs text-text-muted">
                      {activeCount > 0 ? `${activeCount} connected` : "No advisors yet"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {pendingCount > 0 && (
                    <Badge variant="warning">{pendingCount} pending</Badge>
                  )}
                  <ArrowRight className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/advisory-hub/directory">
          <Card className="group cursor-pointer transition-all hover:bg-surface-low">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2F8CD9]/15">
                    <Search className="h-5 w-5 text-[#2F8CD9]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Find Advisors</h3>
                    <p className="text-xs text-text-muted">Browse the advisor directory</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-0.5" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Feature highlights */}
      <h3 className="mb-4 text-sm font-semibold text-text-secondary">How it works</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <Shield className="mb-2 h-5 w-5 text-[#2F8CD9]" />
            <h4 className="text-sm font-medium text-text-primary">Data Privacy</h4>
            <p className="mt-1 text-xs text-text-muted">
              Advisors can view your portfolio but never modify your data.
              Your records remain yours.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <Shield className="mb-2 h-5 w-5 text-[#2F8CD9]" />
            <h4 className="text-sm font-medium text-text-primary">Open-Ended Access</h4>
            <p className="mt-1 text-xs text-text-muted">
              When you approve access, your advisor can view your data
              until you stop sharing. You stay in control.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <Lock className="mb-2 h-5 w-5 text-[#2F8CD9]" />
            <h4 className="text-sm font-medium text-text-primary">You Control Access</h4>
            <p className="mt-1 text-xs text-text-muted">
              Approve or deny connection requests. Revoke access at any time
              with a single click.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
