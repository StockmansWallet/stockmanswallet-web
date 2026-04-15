import { PageHeader } from "@/components/ui/page-header";
import { GridIQNav } from "./grid-iq-sidebar";

export default function GridIQLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Grid IQ"
        titleHref="/dashboard/tools/grid-iq"
        titleClassName="text-4xl font-bold text-teal-400"
        subtitle="Processor grid analysis and kill sheet comparison."
        subtitleClassName="text-sm font-medium text-text-secondary"
      />
      <GridIQNav />
      {children}
    </div>
  );
}
