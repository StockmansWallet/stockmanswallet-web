import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { fetchConversationsServer, fetchMessagesServer } from "@/lib/brangus/conversation-service-server";
import { BrangusChat } from "@/components/app/brangus-chat";

export const metadata = { title: "Chat - Brangus" };

export default async function StockmanIQConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch conversation (RLS ensures user owns it)
  const conversations = await fetchConversationsServer();
  const conversation = conversations.find((c) => c.id === id);
  if (!conversation) notFound();

  const messages = await fetchMessagesServer(id);

  return (
    <div className="flex max-w-3xl flex-col" style={{ height: "calc(100vh - 8rem)" }}>
      <PageHeader
        title="Brangus"
        subtitle="Your AI livestock advisor"
        actions={
          <Link
            href="/dashboard/brangus"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-white/[0.05] hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
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
