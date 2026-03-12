import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { BrangusChat } from "@/components/app/brangus-chat";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Chat - Stockman IQ" };

export default function StockmanIQChatPage() {
  return (
    <div className="flex max-w-3xl flex-col" style={{ height: "calc(100vh - 8rem)" }}>
      <PageHeader
        title="Brangus"
        subtitle="Your AI livestock advisor"
        actions={
          <Link
            href="/dashboard/stockman-iq"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-white/[0.05] hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        }
      />

      <Card className="flex flex-1 flex-col overflow-hidden rounded-3xl">
        <BrangusChat />
      </Card>
    </div>
  );
}
