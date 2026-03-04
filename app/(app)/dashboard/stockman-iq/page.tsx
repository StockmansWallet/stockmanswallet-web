import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain } from "lucide-react";

export const metadata = { title: "Stockman IQ" };

const placeholderInsights = [
  { title: "Angus Feeder Steers trending up 12c/kg this week at Gracemere", category: "Market" },
  { title: "Your Springfield herd is approaching target weight — consider marketing in 3–4 weeks", category: "Portfolio" },
  { title: "Freight rates have dropped on the QLD–NSW corridor", category: "Freight" },
  { title: "Rainfall forecast favourable for northern QLD — pasture recovery likely", category: "Conditions" },
];

export default function StockmanIQPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Stockman IQ"
        subtitle="AI-powered insights and chat for your operation."
        actions={
          <Link href="/dashboard/stockman-iq/chat">
            <Button>New Chat</Button>
          </Link>
        }
      />

      {/* Insights feed */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-text-secondary">Today's Insights</h2>
        <div className="space-y-3">
          {placeholderInsights.map((insight, i) => (
            <Card key={i}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10">
                  <span className="text-xs font-bold text-brand">{insight.category[0]}</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-brand">{insight.category}</p>
                  <p className="mt-0.5 text-sm text-text-primary">{insight.title}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Chat history */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-secondary">Recent Conversations</h2>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
              <Brain className="h-6 w-6 text-brand" />
            </div>
            <p className="text-sm font-medium text-text-primary">No conversations yet</p>
            <p className="mt-1 max-w-xs text-xs text-text-muted">Start a chat with Brangus to get AI-powered insights about your herd and the market.</p>
            <Link href="/dashboard/stockman-iq/chat" className="mt-4 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-dark">
              Chat with Brangus
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
