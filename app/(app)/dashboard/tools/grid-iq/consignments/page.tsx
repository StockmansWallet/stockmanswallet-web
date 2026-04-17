// Consignments list page - shows all processor consignments with status badges

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ConsignmentsList } from "./consignments-list";

export const metadata = { title: "Consignments - Grid IQ" };

export default async function ConsignmentsListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: consignments } = await supabase
    .from("consignments")
    .select(
      "id, consignment_name, processor_name, plant_location, booking_reference, kill_date, status, total_head_count, total_gross_value, updated_at"
    )
    .eq("user_id", user!.id)
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false });

  return (
    <div>
      <div className="mb-4 sm:hidden">
        <Link href="/dashboard/tools/grid-iq">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-text-muted hover:text-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Grid IQ
          </Button>
        </Link>
      </div>

      <PageHeader
        title="Consignments"
        titleClassName="text-2xl font-semibold text-text-primary"
        subtitle="Processor bookings and kill records"
        subtitleClassName="text-sm text-text-muted"
        compact
      />

      <ConsignmentsList consignments={consignments ?? []} />
    </div>
  );
}
