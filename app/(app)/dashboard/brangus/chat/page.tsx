import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { BrangusChat } from "@/components/app/brangus-chat";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Chat - Brangus" };

export default async function StockmanIQChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
        title="Brangus"
        subtitle="Your personal livestock advisor, and new best mate."
        subtitleClassName="mt-1 text-base text-text-muted"
        actions={
          <Link
            href="/dashboard/brangus"
            className="flex items-center gap-1.5 rounded-lg bg-surface-lowest px-2.5 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Link>
        }
      />

      <Card className="flex flex-1 flex-col overflow-hidden rounded-3xl">
        <BrangusChat pastConversationCount={pastConversationCount} />
      </Card>
    </div>
  );
}
