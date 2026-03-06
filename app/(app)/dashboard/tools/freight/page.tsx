import { PageHeader } from "@/components/ui/page-header";
import { FreightCalculator } from "./freight-calculator";

export const metadata = {
  title: "Freight IQ",
};

export default function FreightPage() {
  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Freight IQ"
        subtitle="Calculate freight costs with deck loading and route costing."
      />
      <FreightCalculator />
    </div>
  );
}
