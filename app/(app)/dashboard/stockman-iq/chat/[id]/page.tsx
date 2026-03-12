import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { fetchConversationsServer, fetchMessagesServer } from "@/lib/brangus/conversation-service-server";
import { ConversationReview } from "@/components/app/brangus/conversation-review";

export const metadata = { title: "Chat - Stockman IQ" };

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

  const date = new Date(conversation.created_at).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex max-w-3xl flex-col" style={{ height: "calc(100vh - 8rem)" }}>
      <PageHeader
        title={conversation.title ?? "Conversation"}
        subtitle={date}
      />
      <Card className="flex flex-1 flex-col overflow-hidden">
        <ConversationReview conversation={conversation} messages={messages} />
      </Card>
    </div>
  );
}
