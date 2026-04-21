import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { BrangusChat } from "@/components/app/brangus-chat";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

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

  // Count past conversations to determine greeting style
  let pastConversationCount = 0;
  if (user) {
    const { count } = await supabase
      .from("brangus_conversations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_deleted", false);
    pastConversationCount = count ?? 0;
  }

  return (
    <div className="flex max-w-4xl flex-col" style={{ height: "calc(100vh - 8rem)" }}>
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
        <BrangusChat pastConversationCount={pastConversationCount} prefill={prefill} />
      </Card>
    </div>
  );
}
