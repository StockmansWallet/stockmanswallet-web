import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Chat — Stockman IQ" };

export default function StockmanIQChatPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col" style={{ height: "calc(100vh - 8rem)" }}>
      <PageHeader title="Brangus" subtitle="Your AI livestock advisor" />

      {/* Message list */}
      <Card className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10">
            <svg className="h-7 w-7 text-brand" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
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
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
