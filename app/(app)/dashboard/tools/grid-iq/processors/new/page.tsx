import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { ChevronLeft } from "lucide-react";
import { ProcessorForm } from "../processor-form";

export const metadata = { title: "New Processor - Grid IQ" };

export default function NewProcessorPage() {
  return (
    <div>
      <div className="mb-4">
        <Link
          href="/dashboard/tools/grid-iq/processors"
          className="inline-flex items-center gap-1.5 rounded-full bg-surface-lowest px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-text-primary"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Processors
        </Link>
      </div>

      <PageHeader
        title="New Processor"
        titleClassName="text-2xl font-semibold text-text-primary"
        subtitle="Add a processor you work with. Address and contact details are stored once and reused by every grid, kill sheet, and analysis."
        subtitleClassName="text-sm text-text-muted"
        compact
      />

      <div className="mt-4">
        <ProcessorForm
          mode="create"
          initial={{
            name: "",
            address: null,
            location_latitude: null,
            location_longitude: null,
            contact_name: null,
            contact_phone: null,
            contact_email: null,
            notes: null,
          }}
        />
      </div>
    </div>
  );
}
