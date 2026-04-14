// Consignments list page - shows all processor consignments with status badges

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Truck, ChevronRight, ArrowLeft, Plus } from "lucide-react";

export const metadata = { title: "Consignments - Grid IQ" };

function statusBadge(status: string) {
  switch (status) {
    case "draft":
      return { label: "Draft", cls: "bg-white/[0.06] text-text-muted" };
    case "confirmed":
      return { label: "Confirmed", cls: "bg-teal-500/15 text-teal-400" };
    case "completed":
      return { label: "Completed", cls: "bg-emerald-500/15 text-emerald-400" };
    default:
      return { label: status, cls: "bg-white/[0.06] text-text-muted" };
  }
}

export default async function ConsignmentsListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: consignments } = await supabase
    .from("consignments")
    .select("id, consignment_name, processor_name, plant_location, booking_reference, kill_date, status, total_head_count, total_gross_value, updated_at")
    .eq("user_id", user!.id)
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false });

  const list = consignments ?? [];

  return (
    <div>
      <div className="mb-4 sm:hidden">
        <Link href="/dashboard/tools/grid-iq">
          <Button variant="ghost" size="sm" className="gap-1.5 text-text-muted hover:text-text-primary">
            <ArrowLeft className="h-3.5 w-3.5" />
            Grid IQ
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <PageHeader
          title="Consignments"
          titleClassName="text-2xl font-semibold text-text-primary"
          subtitle="Processor bookings and kill records"
          subtitleClassName="text-sm text-text-muted"
          inline
          compact
        />
        <Link href="/dashboard/tools/grid-iq/consignments/new">
          <Button variant="teal" size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
        </Link>
      </div>

      {list.length > 0 ? (
        <Card>
          <CardContent className="divide-y divide-white/[0.06] p-0">
            {list.map((c) => {
              const badge = statusBadge(c.status);
              return (
                <Link
                  key={c.id}
                  href={`/dashboard/tools/grid-iq/consignments/${c.id}`}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/15">
                    <Truck className="h-5 w-5 text-teal-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary">
                      {c.consignment_name || c.processor_name}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-muted">
                      {c.consignment_name && <span>{c.processor_name}</span>}
                      {c.plant_location && <span>{c.plant_location}</span>}
                      {c.kill_date && (
                        <span>{new Date(c.kill_date).toLocaleDateString("en-AU")}</span>
                      )}
                      {c.booking_reference && <span>Ref: {c.booking_reference}</span>}
                      <span>{c.total_head_count ?? 0} head</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                  {c.total_gross_value != null && c.total_gross_value > 0 && (
                    <span className="text-sm font-semibold text-emerald-400">
                      ${Math.round(c.total_gross_value).toLocaleString()}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 shrink-0 text-text-muted transition-all group-hover:translate-x-0.5 group-hover:text-text-secondary" />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <EmptyState
            title="No consignments yet"
            description="Create a consignment to track cattle sent to a processor. Allocate herds, link kill sheets, and record sales."
            actionLabel="New Consignment"
            actionHref="/dashboard/tools/grid-iq/consignments/new"
            variant="teal"
          />
        </Card>
      )}
    </div>
  );
}
