import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { fetchConversationsServer } from "@/lib/brangus/conversation-service-server";
import { BrangusHub } from "@/components/app/brangus/brangus-hub";
import { BrangusDemoHub } from "@/components/app/brangus/brangus-demo-hub";
import { isAdvisorRole } from "@/lib/types/advisory";

export const metadata = { title: "Brangus" };

export default async function BrangusPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isDemoUser = user?.email?.toLowerCase() === process.env.DEMO_EMAIL?.toLowerCase();

  // Demo account: skip Supabase conversation fetch + AI chat entirely and serve
  // hardcoded sample conversations so visitors can see the feature without
  // costing us tokens.
  const conversations = isDemoUser ? [] : await fetchConversationsServer();

  // Role lookup so the chat hub can route advisor users to the advisor greeting.
  // Producer (default) and missing-profile both resolve to non-advisor.
  let isAdvisor = false;
  if (user && !isDemoUser) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    isAdvisor = profile?.role ? isAdvisorRole(profile.role) : false;
  }
  const userFirstName =
    typeof user?.user_metadata?.first_name === "string" ? user.user_metadata.first_name : undefined;

  return (
    <div className="max-w-4xl">
      <PageHeader
        feature="brangus"
        title="Brangus"
        subtitle="Your personal livestock advisor, and new best mate."
        subtitleClassName="mt-1 text-base text-text-muted"
      />

      {isDemoUser ? (
        <BrangusDemoHub />
      ) : (
        <BrangusHub
          conversations={conversations}
          isAdvisor={isAdvisor}
          userFirstName={userFirstName}
        />
      )}
    </div>
  );
}
