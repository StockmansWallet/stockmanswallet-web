import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ProcessorForm } from "../processor-form";

export const metadata = { title: "New Processor - Grid IQ" };

export default function NewProcessorPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <Link href="/dashboard/tools/grid-iq/processors">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-text-muted hover:text-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Processors
          </Button>
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
