import { PageHeader } from "@/components/ui/page-header";
import { fetchConversationsServer } from "@/lib/brangus/conversation-service-server";
import { BrangusHub } from "@/components/app/brangus/brangus-hub";

export const metadata = { title: "Brangus" };

export default async function BrangusPage() {
  const conversations = await fetchConversationsServer();

  return (
    <div>
      <PageHeader
        title="Brangus"
        titleClassName="text-4xl font-bold text-brand"
        subtitle="Your AI livestock advisor."
      />

      <BrangusHub conversations={conversations} />
    </div>
  );
}
