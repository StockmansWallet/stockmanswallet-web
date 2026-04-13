import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConnectionRealtime } from "@/components/app/advisory/connection-realtime";
import {
  Users,
  Search,
  Shield,
  Handshake,
  Lock,
  ArrowRight,
} from "lucide-react";

export const revalidate = 0;

export const metadata = {
  title: "Advisory Hub",
};

export default async function AdvisoryHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: connections } = await supabase
    .from("connection_requests")
    .select("id, status, target_user_id")
    .or(`target_user_id.eq.${user.id},requester_user_id.eq.${user.id}`)
    .in("status", ["pending", "approved"]);

  // Only count incoming pending (from advisors, where user is target)
  const pendingCount = connections?.filter((c) => c.status === "pending" && c.target_user_id === user.id).length ?? 0;
  const activeCount = connections?.filter((c) => c.status === "approved").length ?? 0;

  const steps = [
    {
      num: 1,
      icon: Shield,
      title: "Data Privacy",
      desc: "Advisors can view your portfolio but never modify your data. Your records remain yours.",
      colour: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
    {
      num: 2,
      icon: Handshake,
      title: "Two-Way Consent",
      desc: "Both you and your advisor must accept the connection before any data is shared.",
      colour: "text-[#2F8CD9]",
      bg: "bg-[#2F8CD9]/10",
    },
    {
      num: 3,
      icon: Lock,
      title: "You Control Access",
      desc: "Choose what to share. Revoke access at any time with a single click.",
      colour: "text-amber-400",
      bg: "bg-amber-400/10",
    },
  ];

  return (
    <div className="max-w-4xl">
      <ConnectionRealtime userId={user.id} />
      <PageHeader
        title="Advisory Hub"
        titleClassName="text-4xl font-bold text-[#2F8CD9]"
        subtitle="Connect with your advisory team"
        subtitleClassName="text-sm font-medium text-text-secondary"
        inline
      />

      {/* Hero card */}
      <Card className="mb-6 overflow-hidden border border-[#2F8CD9]/20">
        <div className="bg-gradient-to-br from-[#2F8CD9]/12 via-[#2F8CD9]/5 to-transparent p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#2F8CD9]/15 shadow-lg shadow-[#2F8CD9]/10">
              <Users className="h-7 w-7 text-[#2F8CD9]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">
                Your Advisory Team
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
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
          <Card className="group cursor-pointer border border-white/5 transition-all hover:border-[#2F8CD9]/30 hover:bg-surface-low">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2F8CD9]/15 shadow-sm">
                    <Users className="h-5 w-5 text-[#2F8CD9]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">My Advisors</h3>
                    <p className="text-xs text-text-muted">
                      {activeCount > 0 ? `${activeCount} connected` : "No advisors yet"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {pendingCount > 0 && (
                    <Badge variant="warning" className="animate-pulse shadow-sm shadow-amber-500/20">
                      {pendingCount} pending
                    </Badge>
                  )}
                  <ArrowRight className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/advisory-hub/directory">
          <Card className="group cursor-pointer border border-white/5 transition-all hover:border-[#2F8CD9]/30 hover:bg-surface-low">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2F8CD9]/15 shadow-sm">
                    <Search className="h-5 w-5 text-[#2F8CD9]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">Find Advisors</h3>
                    <p className="text-xs text-text-muted">Browse the advisor directory</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-0.5" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* How it works - numbered steps */}
      <h3 className="mb-4 text-sm font-semibold text-text-secondary">How it works</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        {steps.map((step) => (
          <Card key={step.num} className="overflow-hidden border border-white/5">
            <CardContent className="relative p-5">
              {/* Step number */}
              <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-xs font-bold text-text-muted">
                {step.num}
              </div>
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${step.bg}`}>
                <step.icon className={`h-5 w-5 ${step.colour}`} />
              </div>
              <h4 className="text-sm font-semibold text-text-primary">{step.title}</h4>
              <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
                {step.desc}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
