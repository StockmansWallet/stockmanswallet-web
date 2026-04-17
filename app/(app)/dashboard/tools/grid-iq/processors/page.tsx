import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ChevronLeft } from "lucide-react";
import { ProcessorsList } from "./processors-list";

export const metadata = { title: "Processors - Grid IQ" };

export default async function ProcessorsListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: processors } = await supabase
    .from("processors")
    .select(
      "id, name, address, location_latitude, location_longitude, contact_name, contact_phone, is_primary, updated_at"
    )
    .eq("user_id", user!.id)
    .eq("is_deleted", false)
    .order("is_primary", { ascending: false })
    .order("name", { ascending: true });

  // Counts of related records per processor for the list view
  const processorIds = (processors ?? []).map((p) => p.id);
  const counts = new Map<
    string,
    { grids: number; killSheets: number }
  >();
  if (processorIds.length > 0) {
    const [{ data: grids }, { data: killSheets }] = await Promise.all([
      supabase
        .from("processor_grids")
        .select("processor_id")
        .in("processor_id", processorIds)
        .eq("is_deleted", false),
      supabase
        .from("kill_sheet_records")
        .select("processor_id")
        .in("processor_id", processorIds)
        .eq("is_deleted", false),
    ]);
    for (const id of processorIds) counts.set(id, { grids: 0, killSheets: 0 });
    for (const g of grids ?? []) {
      const pid = g.processor_id as string | null;
      if (pid) counts.get(pid)!.grids++;
    }
    for (const k of killSheets ?? []) {
      const pid = k.processor_id as string | null;
      if (pid) counts.get(pid)!.killSheets++;
    }
  }

  const rows = (processors ?? []).map((p) => ({
    ...p,
    grid_count: counts.get(p.id)?.grids ?? 0,
    kill_sheet_count: counts.get(p.id)?.killSheets ?? 0,
  }));

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

      <ProcessorsList processors={rows} />
    </div>
  );
}
