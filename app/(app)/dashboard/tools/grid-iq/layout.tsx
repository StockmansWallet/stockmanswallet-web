import { PageHeader } from "@/components/ui/page-header";
import { GridIQSidebar } from "./grid-iq-sidebar";

export default function GridIQLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Grid IQ"
        titleHref="/dashboard/tools/grid-iq"
        titleClassName="text-4xl font-bold text-teal-400"
        subtitle="Processor intelligence"
        subtitleClassName="text-sm font-medium text-text-secondary"
        inline
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <GridIQSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
