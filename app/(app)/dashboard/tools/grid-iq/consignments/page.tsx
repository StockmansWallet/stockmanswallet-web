// Consignments list page - shows all processor consignments with status badges

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ChevronLeft } from "lucide-react";
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
        <Link
          href="/dashboard/tools/grid-iq"
          className="inline-flex items-center gap-1.5 rounded-full bg-surface-lowest px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-text-primary"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Grid IQ
        </Link>
      </div>

      <ConsignmentsList consignments={consignments ?? []} />
    </div>
  );
}
