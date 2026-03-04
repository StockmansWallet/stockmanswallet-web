import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = {
  title: "Properties",
};

export default async function PropertiesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .eq("user_id", user!.id)
    .eq("is_deleted", false)
    .order("property_name");

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Properties"
        subtitle="Manage your properties and locations."
        actions={
          <Link href="/dashboard/properties/new">
            <Button>Add Property</Button>
          </Link>
        }
      />

      {!properties || properties.length === 0 ? (
        <Card>
          <EmptyState
            title="No properties yet"
            description="Add your first property to organise your herds by location."
            actionLabel="Add Property"
            actionHref="/dashboard/properties/new"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <Link
              key={property.id}
              href={`/dashboard/properties/${property.id}`}
            >
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="mb-3 flex items-start justify-between">
                    <h3 className="text-sm font-semibold text-text-primary">
                      {property.property_name}
                    </h3>
                    <Badge variant="default">{property.state}</Badge>
                  </div>

                  {property.property_pic && (
                    <p className="mb-1 text-xs text-text-muted">
                      PIC: {property.property_pic}
                    </p>
                  )}

                  {property.acreage && (
                    <p className="mb-1 text-xs text-text-muted">
                      {property.acreage.toLocaleString()} acres
                    </p>
                  )}

                  {property.suburb && (
                    <p className="mt-2 text-xs text-text-secondary">
                      {property.suburb}{property.postcode ? `, ${property.postcode}` : ""}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
