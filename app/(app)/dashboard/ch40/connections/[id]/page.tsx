import { ProducerNetworkHub } from "../../ch40-hub";

export const metadata = {
  title: "Producer Chat",
};

export default async function ProducerConnectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProducerNetworkHub selectedConnectionId={id} />;
}
