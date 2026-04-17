import { redirect } from "next/navigation";

export default async function RedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const tab = type === "killsheet" ? "kill-sheets" : "grids";
  redirect(`/dashboard/tools/grid-iq/library?tab=${tab}`);
}
