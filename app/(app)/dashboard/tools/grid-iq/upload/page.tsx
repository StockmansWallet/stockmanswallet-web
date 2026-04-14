import { PageHeader } from "@/components/ui/page-header";
import { GridIQUploader } from "./grid-iq-uploader";

export const metadata = { title: "Upload - Grid IQ" };

export default async function GridIQUploadPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const initialType = type === "killsheet" ? "killsheet" : "grid";

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={initialType === "killsheet" ? "Upload Kill Sheet" : "Upload Grid"}
        titleClassName="text-2xl font-semibold text-text-primary"
        subtitle={initialType === "killsheet"
          ? "Upload a kill sheet to track over-the-hooks performance."
          : "Upload a processor grid photo or PDF to extract the price matrix."
        }
        subtitleClassName="text-sm text-text-muted"
        compact
      />
      <GridIQUploader key={initialType} initialType={initialType} />
    </div>
  );
}
