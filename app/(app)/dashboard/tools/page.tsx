import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FreightCalculator } from "./freight-calculator";

export const metadata = {
  title: "Tools",
};

export default function ToolsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Tools"
        subtitle="Calculators and utilities for your operation."
      />

      <Card>
        <CardHeader>
          <CardTitle>Freight Calculator</CardTitle>
        </CardHeader>
        <CardContent>
          <FreightCalculator />
        </CardContent>
      </Card>
    </div>
  );
}
