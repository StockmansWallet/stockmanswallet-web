import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, TrendingUp, Wallet, Truck, Cloud, MessageSquare } from "lucide-react";

export const metadata = { title: "Stockman IQ" };

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Market: TrendingUp,
  Portfolio: Wallet,
  Freight: Truck,
  Conditions: Cloud,
};

const placeholderInsights = [
  { title: "Angus Feeder Steers trending up 12c/kg this week at Gracemere", category: "Market" },
  { title: "Your Springfield herd is approaching target weight \u2014 consider marketing in 3\u20134 weeks", category: "Portfolio" },
  { title: "Freight rates have dropped on the QLD\u2013NSW corridor", category: "Freight" },
  { title: "Rainfall forecast favourable for northern QLD \u2014 pasture recovery likely", category: "Conditions" },
];

export default function StockmanIQPage() {
  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Stockman IQ"
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

      {/* Insights feed */}
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Today&apos;s Insights</h2>
        <div className="space-y-3">
          {placeholderInsights.map((insight, i) => {
            const Icon = categoryIcons[insight.category] ?? TrendingUp;
            return (
              <Card key={i} className="transition-all hover:bg-white/[0.07]">
                <CardContent className="flex items-start gap-3.5 p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/15">
                    <Icon className="h-4 w-4 text-brand" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-brand">{insight.category}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-text-primary">{insight.title}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Chat history */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Recent Conversations</h2>
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
              <Brain className="h-6 w-6 text-brand" />
            </div>
            <p className="text-sm font-medium text-text-primary">No conversations yet</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-text-muted">Start a chat with Brangus to get AI-powered insights about your herd and the market.</p>
            <Link href="/dashboard/stockman-iq/chat" className="mt-4 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-dark">
              Chat with Brangus
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
