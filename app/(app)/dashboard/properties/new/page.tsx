import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PropertyForm } from "@/components/app/property-form";
import { createClient } from "@/lib/supabase/server";
import { createProperty } from "../actions";

export const metadata = {
  title: "Add Property",
};

export default async function NewPropertyPage() {
  // Look up whether the user already has properties so the form knows to show
  // the "Set as primary" toggle (hidden on first-property creation).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let hasOtherProperties = false;
  if (user) {
    const { count } = await supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .eq("is_simulated", false);
    hasOtherProperties = (count ?? 0) > 0;
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Add Property"
        subtitle="Add a new property with its default settings."
      />
      <Card>
        <CardContent className="p-6">
          <PropertyForm
            action={createProperty}
            submitLabel="Add Property"
            hasOtherProperties={hasOtherProperties}
          />
        </CardContent>
      </Card>
    </div>
  );
}
