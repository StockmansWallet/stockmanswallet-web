import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { BrangusChat } from "@/components/app/brangus-chat";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isAdvisorRole } from "@/lib/types/advisory";

export const metadata = { title: "Chat - Brangus" };

type Props = {
  searchParams: Promise<{ prefill?: string }>;
};

export default async function BrangusChatPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Demo account has no access to the live AI endpoint.
  if (user?.email?.toLowerCase() === process.env.DEMO_EMAIL?.toLowerCase()) {
    redirect("/dashboard/brangus");
  }

  const sp = await searchParams;
  const prefill =
    typeof sp.prefill === "string" && sp.prefill.trim().length > 0 ? sp.prefill.trim() : undefined;

  // Count past conversations to determine greeting style + look up role for advisor branching
  let pastConversationCount = 0;
  let isAdvisor = false;
  if (user) {
    const [{ count }, { data: profile }] = await Promise.all([
      supabase
        .from("brangus_conversations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_deleted", false),
      supabase.from("user_profiles").select("role").eq("user_id", user.id).single(),
    ]);
    pastConversationCount = count ?? 0;
    isAdvisor = profile?.role ? isAdvisorRole(profile.role) : false;
  }
  const userFirstName =
    typeof user?.user_metadata?.first_name === "string" ? user.user_metadata.first_name : undefined;

  return (
    <div className="flex w-full max-w-[1680px] flex-col pb-10" style={{ height: "calc(100vh - 8rem)" }}>
      <PageHeader
        feature="brangus"
        title="Brangus"
        subtitle="Your personal livestock advisor, and new best mate."
        subtitleClassName="mt-1 text-base text-text-muted"
        actions={
          <Link
            href="/dashboard/brangus"
            className="bg-surface-lowest text-text-secondary hover:bg-surface-raised hover:text-text-primary flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Link>
        }
      />

      <Card className="flex flex-1 flex-col overflow-hidden rounded-3xl">
        <BrangusChat
          pastConversationCount={pastConversationCount}
          prefill={prefill}
          isAdvisor={isAdvisor}
          userFirstName={userFirstName}
        />
      </Card>
    </div>
  );
}
