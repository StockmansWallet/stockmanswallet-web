import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Send } from "lucide-react";

export const metadata = { title: "Chat — Stockman IQ" };

export default async function StockmanIQConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto flex max-w-3xl flex-col" style={{ height: "calc(100vh - 8rem)" }}>
      <PageHeader title="Brangus" subtitle={`Conversation ${id.slice(0, 8)}`} />
      <Card className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-text-muted">Conversation history will appear here.</p>
        </div>
        <div className="border-t border-black/5 p-4 dark:border-white/5">
          <div className="flex items-end gap-2">
            <textarea
              rows={1}
              placeholder="Continue the conversation..."
              className="flex-1 resize-none rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/10 dark:bg-white/5"
            />
            <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white hover:bg-brand-dark">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
