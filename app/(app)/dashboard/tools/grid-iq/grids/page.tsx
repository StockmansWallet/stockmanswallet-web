import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Upload, AlertTriangle, Grid3x3, ChevronRight } from "lucide-react";

export const metadata = { title: "Saved Grids - Grid IQ" };

export default async function SavedGridsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: grids } = await supabase
    .from("processor_grids")
    .select(
      "id, processor_name, grid_code, grid_date, expiry_date, location, notes, created_at"
    )
    .eq("user_id", user!.id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  const safeGrids = grids ?? [];

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Saved Grids"
        subtitle="Your uploaded processor price grids."
        actions={
          <Link href="/dashboard/tools/grid-iq/upload">
            <Button size="sm" variant="teal">
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Upload Grid
            </Button>
          </Link>
        }
      />

      {safeGrids.length > 0 ? (
        <Card>
          <CardContent className="divide-y divide-white/[0.06] p-0">
            {safeGrids.map((g: Record<string, unknown>) => {
              const expiry = g.expiry_date
                ? new Date(g.expiry_date as string)
                : null;
              const now = new Date();
              const daysUntilExpiry = expiry
                ? Math.ceil(
                    (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                  )
                : null;
              const isExpired =
                daysUntilExpiry !== null && daysUntilExpiry < 0;
              const isExpiringSoon =
                daysUntilExpiry !== null &&
                daysUntilExpiry >= 0 &&
                daysUntilExpiry <= 7;

              return (
                <div
                  key={g.id as string}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/15">
                    <Grid3x3 className="h-5 w-5 text-teal-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary">
                      {g.processor_name as string}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-muted">
                      {g.grid_code ? <span>{String(g.grid_code)}</span> : null}
                      <span>
                        {new Date(
                          g.grid_date as string
                        ).toLocaleDateString("en-AU")}
                      </span>
                      {expiry && !isExpired && !isExpiringSoon && (
                        <span>
                          Expires{" "}
                          {expiry.toLocaleDateString("en-AU")}
                        </span>
                      )}
                      {g.location ? <span>{String(g.location)}</span> : null}
                    </div>
                  </div>
                  {(isExpired || isExpiringSoon) && (
                    <div
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                        isExpired
                          ? "bg-red-500/15 text-red-400"
                          : "bg-amber-500/15 text-amber-400"
                      }`}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {isExpired
                        ? "Expired"
                        : `${daysUntilExpiry}d left`}
                    </div>
                  )}
                  <ChevronRight className="h-4 w-4 shrink-0 text-text-muted/50 transition-all group-hover:translate-x-0.5 group-hover:text-text-muted" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <EmptyState
            title="No grids uploaded yet"
            description="Upload a processor grid photo or PDF. Grid IQ will extract the price matrix automatically."
            actionLabel="Upload Grid"
            actionHref="/dashboard/tools/grid-iq/upload"
            variant="teal"
          />
        </Card>
      )}
    </div>
  );
}
