import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { FreightCalculator } from "./freight-calculator";

export const metadata = {
  title: "Freight IQ",
};

export default function FreightPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Freight IQ"
        subtitle="Calculate freight costs with deck loading and route costing."
      />

      <Card>
        <CardContent className="p-6">
          <FreightCalculator />
        </CardContent>
      </Card>
    </div>
  );
}
