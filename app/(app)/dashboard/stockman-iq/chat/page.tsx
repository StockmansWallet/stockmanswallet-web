import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { BrangusChat } from "@/components/app/brangus-chat";

export const metadata = { title: "Chat - Stockman IQ" };

export default function StockmanIQChatPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col" style={{ height: "calc(100vh - 8rem)" }}>
      <PageHeader title="Brangus" subtitle="Your AI livestock advisor" />

      <Card className="flex flex-1 flex-col overflow-hidden">
        <BrangusChat />
      </Card>
    </div>
  );
}
