import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { GridIQNav } from "./grid-iq-sidebar";

export default async function GridIQLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let pendingConsignments = 0;
  if (user) {
    const { count } = await supabase
      .from("consignments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .in("status", ["draft", "confirmed"]);
    pendingConsignments = count ?? 0;
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Grid IQ"
        titleHref="/dashboard/tools/grid-iq"
        titleClassName="text-4xl font-bold text-indigo-400"
        subtitle="Processor grid analysis and kill sheet comparison."
        subtitleClassName="text-sm font-medium text-text-secondary"
      />
      <GridIQNav pendingConsignments={pendingConsignments} />
      {children}
    </div>
  );
}
