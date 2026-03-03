import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PropertyForm } from "@/components/app/property-form";
import { updateProperty, deleteProperty } from "../actions";
import { DeletePropertyButton } from "./delete-button";

export const metadata = {
  title: "Property Details",
};

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (!property) notFound();

  const boundUpdate = updateProperty.bind(null, id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={property.property_name}
        subtitle={[property.state, property.property_pic]
          .filter(Boolean)
          .join(" · ")}
        actions={<DeletePropertyButton id={id} name={property.property_name} />}
      />

      <Card>
        <CardContent className="p-6">
          <PropertyForm
            property={property}
            action={boundUpdate}
            submitLabel="Save Changes"
          />
        </CardContent>
      </Card>
    </div>
  );
}
