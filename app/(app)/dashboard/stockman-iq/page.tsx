import { PageHeader } from "@/components/ui/page-header";
import { fetchConversationsServer } from "@/lib/brangus/conversation-service-server";
import { evaluateInsights } from "@/lib/stockman-iq/insight-engine";
import { StockmanIQTabs } from "@/components/app/stockman-iq/stockman-iq-tabs";

export const metadata = { title: "Stockman IQ" };

export default async function StockmanIQPage() {
  const [conversations, insights] = await Promise.all([
    fetchConversationsServer(),
    evaluateInsights(),
  ]);

  return (
    <div>
      <PageHeader
        title="Stockman IQ"
        titleClassName="text-4xl font-bold text-brand"
        subtitle="AI-powered insights and chat for your operation."
      />

      <StockmanIQTabs conversations={conversations} insights={insights} />
    </div>
  );
}
