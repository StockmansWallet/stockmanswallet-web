import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "Sale Locations" };

export default function SaleLocationsPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-4 sm:hidden">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 rounded-lg bg-surface-lowest px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Settings
        </Link>
      </div>
      <PageHeader
        title="Sale Locations"
        titleClassName="text-4xl font-bold text-sky-400"
        subtitle="Manage your saleyards and custom sale locations."
        actions={
          <Link href="/dashboard/settings/sale-locations/new">
            <Button size="sm">Add Location</Button>
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
