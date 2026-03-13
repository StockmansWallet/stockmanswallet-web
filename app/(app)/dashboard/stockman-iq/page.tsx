import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, MessageSquare, Sparkles } from "lucide-react";
import { fetchConversationsServer } from "@/lib/brangus/conversation-service-server";
import { ConversationList } from "@/components/app/brangus/conversation-list";
import { evaluateInsights } from "@/lib/stockman-iq/insight-engine";
import { InsightCard } from "@/components/app/stockman-iq/insight-card";

export const metadata = { title: "Stockman IQ" };

export default async function StockmanIQPage() {
  const [conversations, insights] = await Promise.all([
    fetchConversationsServer(),
    evaluateInsights(),
  ]);

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Stockman IQ"
        titleClassName="text-4xl font-bold text-brand"
        subtitle="AI-powered insights and chat for your operation."
        actions={
          <Link href="/dashboard/stockman-iq/chat">
            <Button size="sm">
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              New Chat
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Conversations */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Recent Conversations</h2>
          {conversations.length > 0 ? (
            <Card>
              <CardContent className="p-2">
                <ConversationList conversations={conversations} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
                  <Brain className="h-6 w-6 text-brand" />
                </div>
                <p className="text-sm font-medium text-text-primary">No conversations yet</p>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-text-muted">Start a chat with Brangus to get AI-powered insights about your herd and the market.</p>
                <Link href="/dashboard/stockman-iq/chat" className="mt-4 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-dark">
                  Chat with Brangus
                </Link>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Insights feed */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Your Insights</h2>
          {insights.length > 0 ? (
            <div className="space-y-3">
              {insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
                  <Sparkles className="h-6 w-6 text-brand" />
                </div>
                <p className="text-sm font-medium text-text-primary">No insights yet</p>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-text-muted">Add some herds to your portfolio and insights will appear here automatically.</p>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
