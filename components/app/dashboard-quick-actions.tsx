import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, Home, Truck } from "lucide-react";

export function DashboardQuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5">
        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Link
            href="/dashboard/herds/new"
            className="group flex flex-col items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-4 text-center transition-colors hover:bg-white/[0.06]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/15 text-brand transition-transform group-hover:scale-105">
              <Plus className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-medium text-text-secondary">Add Herd</span>
          </Link>
          <Link
            href="/dashboard/properties/new"
            className="group flex flex-col items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-4 text-center transition-colors hover:bg-white/[0.06]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/15 text-brand transition-transform group-hover:scale-105">
              <Home className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-medium text-text-secondary">Add Property</span>
          </Link>
          <Link
            href="/dashboard/tools/freight"
            className="group flex flex-col items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-4 text-center transition-colors hover:bg-white/[0.06]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/15 text-brand transition-transform group-hover:scale-105">
              <Truck className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-medium text-text-secondary">Freight IQ</span>
          </Link>
        </div>

      </CardContent>
    </Card>
  );
}
