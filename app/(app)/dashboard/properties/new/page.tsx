import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PropertyForm } from "@/components/app/property-form";
import { createProperty } from "../actions";

export const metadata = {
  title: "Add Property",
};

export default function NewPropertyPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Add Property"
        subtitle="Add a new property with its default settings."
      />
      <Card>
        <CardContent className="p-6">
          <PropertyForm action={createProperty} submitLabel="Add Property" />
        </CardContent>
      </Card>
    </div>
  );
}
