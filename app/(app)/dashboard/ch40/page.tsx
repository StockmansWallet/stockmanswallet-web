import { ProducerNetworkHub } from "./ch40-hub";

export const revalidate = 0;

export const metadata = {
  title: "Ch 40",
};

export default async function ProducerNetworkPage({
  searchParams,
}: {
  searchParams: Promise<{ panel?: string; pending?: string }>;
}) {
  const params = await searchParams;
  return (
    <ProducerNetworkHub
      mode={params.panel === "find" ? "find" : undefined}
      selectedPendingConnectionId={params.pending}
    />
  );
}
