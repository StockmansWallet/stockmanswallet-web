import { redirect } from "next/navigation";

export default async function RedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const mappedTab =
    tab === "killsheets"
      ? "kill-sheets"
      : tab === "upload"
        ? "grids"
        : tab === "grids"
          ? "grids"
          : "grids";
  redirect(`/dashboard/tools/grid-iq/library?tab=${mappedTab}`);
}
