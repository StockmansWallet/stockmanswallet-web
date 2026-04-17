import { redirect } from "next/navigation";

export default async function RedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const target =
    tab === "post-kill" || tab === "post_sale" ? "post-kill" : "pre-sale";
  redirect(`/dashboard/tools/grid-iq/library?tab=analyses&sub=${target}`);
}
