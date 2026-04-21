import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { fetchConversationsServer } from "@/lib/brangus/conversation-service-server";
import { BrangusHub } from "@/components/app/brangus/brangus-hub";
import { BrangusDemoHub } from "@/components/app/brangus/brangus-demo-hub";

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

  return (
    <div className="max-w-4xl">
      <PageHeader
        feature="brangus"
        title="Brangus"
        subtitle="Your personal livestock advisor, and new best mate."
        subtitleClassName="mt-1 text-base text-text-muted"
      />

      {isDemoUser ? <BrangusDemoHub /> : <BrangusHub conversations={conversations} />}
    </div>
  );
}
