import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { PropertyForm } from "@/components/app/property-form";
import { updateProperty } from "../actions";
import { DeletePropertyButton } from "./delete-button";
import { MapPinned, Landmark, Ruler } from "lucide-react";

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
    .eq("is_deleted", false)
    .single();

  if (!property) notFound();

  const boundUpdate = updateProperty.bind(null, id);

  return (
    <div className="max-w-4xl">
      {/* Property header */}
      <div className="mb-6 mt-6 flex items-end gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand/15">
          <MapPinned className="h-7 w-7 text-brand" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-text-primary">{property.property_name}</h1>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-text-secondary">
            {property.state && <span>{property.state}</span>}
            {property.property_pic && (
              <>
                <span className="text-white/15">|</span>
                <span>PIC: {property.property_pic}</span>
              </>
            )}
            {property.lga && (
              <>
                <span className="text-white/15">|</span>
                <span>{property.lga}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10">
              <MapPinned className="h-5 w-5 text-brand" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">
                {property.address || property.suburb || "Not set"}
              </p>
              <p className="text-[11px] text-text-muted">Address</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/10">
              <Landmark className="h-5 w-5 text-success" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">
                {property.region || property.lga || "Not set"}
              </p>
              <p className="text-[11px] text-text-muted">Region</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/10">
              <Ruler className="h-5 w-5 text-warning" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">
                {property.acreage ? `${Number(property.acreage).toLocaleString()} acres` : "Not set"}
              </p>
              <p className="text-[11px] text-text-muted">Acreage</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit form with action bar */}
      <PropertyForm
        property={property}
        action={boundUpdate}
        submitLabel="Save"
        cancelHref="/dashboard/properties"
        deleteButton={<DeletePropertyButton id={id} name={property.property_name} />}
        actionBarLayout
      />
    </div>
  );
}
