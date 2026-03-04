import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Brain, Send } from "lucide-react";

export const metadata = { title: "Chat — Stockman IQ" };

export default function StockmanIQChatPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col" style={{ height: "calc(100vh - 8rem)" }}>
      <PageHeader title="Brangus" subtitle="Your AI livestock advisor" />

      {/* Message list */}
      <Card className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10">
            <Brain className="h-7 w-7 text-brand" />
          </div>
          <div>
            <p className="font-semibold text-text-primary">G'day, I'm Brangus</p>
            <p className="mt-1 max-w-sm text-sm text-text-muted">Ask me anything about your herd, freight costs, market conditions, or livestock management.</p>
          </div>

          {/* Suggested prompts */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {[
              "What's my portfolio worth today?",
              "Compare freight costs to Gracemere vs Roma",
              "When should I market my steers?",
              "How are cattle prices trending?",
            ].map((prompt) => (
              <button
                key={prompt}
                className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-text-secondary hover:bg-black/5 dark:border-white/10 dark:bg-white/5"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-black/5 p-4 dark:border-white/5">
          <div className="flex items-end gap-2">
            <textarea
              rows={1}
              placeholder="Ask Brangus anything..."
              className="flex-1 resize-none rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/10 dark:bg-white/5"
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
