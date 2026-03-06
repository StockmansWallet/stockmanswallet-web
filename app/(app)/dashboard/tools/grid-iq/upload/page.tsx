import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { GridIQUploader } from "./grid-iq-uploader";

export const metadata = { title: "Upload - Grid IQ" };

export default function GridIQUploadPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Upload"
        subtitle="Upload a processor grid or kill sheet to analyse."
        actions={
          <Link
            href="/dashboard/tools/grid-iq"
            className="inline-flex h-8 items-center justify-center rounded-xl px-3.5 text-[13px] font-semibold text-text-secondary transition-all duration-150 hover:bg-white/8 hover:text-text-primary"
          >
            Cancel
          </Link>
        }
      />
      <GridIQUploader />
    </div>
  );
}
