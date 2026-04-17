import { redirect } from "next/navigation";

export default async function RedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/tools/grid-iq/consignments/${id}#post-sale`);
}
