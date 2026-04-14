import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText, ChevronRight, ArrowLeft } from "lucide-react";

export const metadata = { title: "Kill Sheet History - Grid IQ" };

export default async function KillSheetHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: killSheets } = await supabase
    .from("kill_sheet_records")
    .select(
      "id, record_name, processor_name, grid_code, kill_date, total_head_count, total_body_weight, total_gross_value, average_body_weight, average_price_per_kg, condemns, realisation_factor, created_at"
    )
    .eq("user_id", user!.id)
    .eq("is_deleted", false)
    .order("kill_date", { ascending: false });

  const safeKillSheets = killSheets ?? [];

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

      <PageHeader
        title="Kill Sheet History"
        titleClassName="text-2xl font-semibold text-text-primary"
        subtitle="Over-the-hooks performance"
        subtitleClassName="text-sm text-text-muted"
        inline
        compact
      />

      {safeKillSheets.length > 0 ? (
        <Card>
          <CardContent className="divide-y divide-white/[0.06] p-0">
            {safeKillSheets.map((ks: Record<string, unknown>) => {
              const rf = ks.realisation_factor as number | null;

              return (
                <Link
                  key={ks.id as string}
                  href={`/dashboard/tools/grid-iq/history/${ks.id}`}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/15">
                    <FileText className="h-5 w-5 text-teal-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary">
                      {(ks.record_name as string | null) || (ks.processor_name as string)}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-muted">
                      {(ks.record_name as string | null) ? <span>{ks.processor_name as string}</span> : null}
                      <span>
                        {new Date(
                          ks.kill_date as string
                        ).toLocaleDateString("en-AU")}
                      </span>
                      <span>
                        {ks.total_head_count as number} head
                      </span>
                      <span>
                        {Math.round(
                          ks.average_body_weight as number
                        )}
                        kg avg
                      </span>
                      {ks.grid_code ? (
                        <span>{String(ks.grid_code)}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-text-primary">
                      $
                      {Math.round(
                        ks.total_gross_value as number
                      ).toLocaleString()}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      $
                      {(ks.average_price_per_kg as number).toFixed(2)}
                      /kg
                      {rf ? ` · ${Math.round(rf * 100)}% RF` : ""}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-text-muted transition-all group-hover:translate-x-0.5 group-hover:text-text-secondary" />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <EmptyState
            title="No kill sheets yet"
            description="Upload kill sheets to start tracking your over-the-hooks performance. Kill history improves Grid IQ accuracy with personalised realisation factors."
            actionLabel="Upload Kill Sheet"
            actionHref="/dashboard/tools/grid-iq/upload"
            variant="teal"
          />
        </Card>
      )}
    </div>
  );
}
