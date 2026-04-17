import { Card, CardContent } from "@/components/ui/card";
import { ReportCompositionChart } from "@/components/app/report-composition-chart";
import type { HerdCompositionItem } from "@/lib/types/reports";

export function HerdCompositionCard({ data }: { data: HerdCompositionItem[] }) {
  return (
    <Card>
      <CardContent className="px-5 py-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Herd Composition</p>
        <ReportCompositionChart data={data} />
      </CardContent>
    </Card>
  );
}
