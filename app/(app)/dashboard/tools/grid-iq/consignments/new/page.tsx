// New consignment page - create a processor booking with herd allocations

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { ConsignmentForm } from "@/components/grid-iq/consignment-form";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "New Consignment - Grid IQ" };

export default async function NewConsignmentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch user's active herds for allocation selector
  const { data: herds } = await supabase
    .from("herds")
    .select("id, name, head_count, category, species")
    .eq("user_id", user!.id)
    .eq("is_deleted", false)
    .eq("is_sold", false)
    .gt("head_count", 0)
    .order("name");

  // Fetch user's grids for optional linking
  const { data: grids } = await supabase
    .from("processor_grids")
    .select("id, grid_name, processor_name, grid_code")
    .eq("user_id", user!.id)
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false });

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/dashboard/tools/grid-iq/consignments"
          className="inline-flex items-center gap-1.5 rounded-full bg-surface-lowest px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-text-primary"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Consignments
        </Link>
      </div>

      <PageHeader feature="grid-iq"
        title="New Consignment"
        titleClassName="text-2xl font-semibold text-text-primary"
        subtitle="Create a processor booking and allocate cattle from your herds"
        subtitleClassName="text-sm text-text-muted"
        compact
      />

      <ConsignmentForm
        herds={herds ?? []}
        grids={grids ?? []}
      />
    </div>
  );
}
