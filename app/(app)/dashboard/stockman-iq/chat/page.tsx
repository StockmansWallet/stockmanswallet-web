import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Brain, Send } from "lucide-react";

export const metadata = { title: "Chat \u2014 Stockman IQ" };

export default function StockmanIQChatPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col" style={{ height: "calc(100vh - 8rem)" }}>
      <PageHeader title="Brangus" subtitle="Your AI livestock advisor" />

      <Card className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10">
            <Brain className="h-7 w-7 text-brand" />
          </div>
          <div>
            <p className="font-semibold text-text-primary">G&apos;day, I&apos;m Brangus</p>
            <p className="mt-1 max-w-sm text-sm leading-relaxed text-text-muted">Ask me anything about your herd, freight costs, market conditions, or livestock management.</p>
          </div>

          {/* Suggested prompts */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {[
              "What\u2019s my portfolio worth today?",
              "Compare freight costs to Gracemere vs Roma",
              "When should I market my steers?",
              "How are cattle prices trending?",
            ].map((prompt) => (
              <button
                key={prompt}
                className="rounded-full bg-white/5 px-3.5 py-1.5 text-xs text-text-secondary ring-1 ring-inset ring-white/8 transition-all hover:bg-white/8 hover:text-text-primary"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-white/6 p-4">
          <div className="flex items-end gap-2">
            <textarea
              rows={1}
              placeholder="Ask Brangus anything..."
              className="flex-1 resize-none rounded-xl bg-white/5 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none ring-1 ring-inset ring-white/10 transition-all focus:ring-brand/60 focus:bg-white/8"
            />
            <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white transition-colors hover:bg-brand-dark">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
