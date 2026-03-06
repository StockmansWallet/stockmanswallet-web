import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, MapPinned, ChevronRight } from "lucide-react";

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
    <div className="max-w-6xl">
      <PageHeader
        title="Properties"
        subtitle="Manage your properties and locations."
        actions={
          <Link href="/dashboard/properties/new">
            <Button>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Property
            </Button>
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
          {properties.map((property) => (
            <Link key={property.id} href={`/dashboard/properties/${property.id}`}>
              <Card className="group h-full transition-all hover:bg-white/[0.07]">
                <div className="p-5">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/15">
                        <MapPinned className="h-4 w-4 text-brand" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-text-primary">{property.property_name}</h3>
                        {property.suburb && (
                          <p className="text-xs text-text-muted">
                            {property.suburb}{property.postcode ? `, ${property.postcode}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-text-muted/50 transition-all group-hover:translate-x-0.5 group-hover:text-text-muted" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="default">{property.state}</Badge>
                    {property.property_pic && (
                      <span className="text-xs text-text-muted">PIC: {property.property_pic}</span>
                    )}
                    {property.acreage && (
                      <span className="text-xs tabular-nums text-text-muted">{property.acreage.toLocaleString()} acres</span>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
