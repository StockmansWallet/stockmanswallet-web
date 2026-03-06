import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Sale Locations" };

export default function SaleLocationsPage() {
  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Sale Locations"
        subtitle="Manage your saleyards and custom sale locations."
        actions={
          <Link href="/dashboard/settings/sale-locations/new">
            <Button>Add Location</Button>
          </Link>
        }
      />
      <Card>
        <EmptyState
          title="No custom locations yet"
          description="Add custom sale locations such as private sales or farm gate sales. Standard saleyards are already included."
          actionLabel="Add Location"
          actionHref="/dashboard/settings/sale-locations/new"
        />
      </Card>
    </div>
  );
}
