import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  fetchConversationsServer,
  fetchMessagesServer,
} from "@/lib/brangus/conversation-service-server";
import { BrangusChat } from "@/components/app/brangus-chat";

export const metadata = { title: "Chat - Brangus" };

export default async function BrangusConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Demo account has no live conversations and no access to the AI endpoint.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.email?.toLowerCase() === process.env.DEMO_EMAIL?.toLowerCase()) {
    redirect("/dashboard/brangus");
  }

  // Fetch conversation (RLS ensures user owns it)
  const conversations = await fetchConversationsServer();
  const conversation = conversations.find((c) => c.id === id);
  if (!conversation) notFound();

  const messages = await fetchMessagesServer(id);

  return (
    <div className="flex max-w-3xl flex-col" style={{ height: "calc(100vh - 8rem)" }}>
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
        <BrangusChat conversationId={id} initialMessages={messages} />
      </Card>
    </div>
  );
}
