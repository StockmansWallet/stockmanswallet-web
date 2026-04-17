"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/client";
import {
  Truck,
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
  Check,
} from "lucide-react";

interface ConsignmentRow {
  id: string;
  consignment_name: string | null;
  processor_name: string;
  plant_location: string | null;
  booking_reference: string | null;
  kill_date: string | null;
  status: string;
  total_head_count: number | null;
  total_gross_value: number | null;
  updated_at: string;
}

function statusBadge(status: string) {
  switch (status) {
    case "draft":
      return { label: "Draft", cls: "bg-white/[0.06] text-text-muted" };
    case "confirmed":
      return { label: "Confirmed", cls: "bg-indigo-500/15 text-indigo-400" };
    case "completed":
      return { label: "Completed", cls: "bg-emerald-500/15 text-emerald-400" };
    default:
      return { label: status, cls: "bg-white/[0.06] text-text-muted" };
  }
}

interface Props {
  consignments: ConsignmentRow[];
}

export function ConsignmentsList({ consignments }: Props) {
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const exit = () => {
    setSelecting(false);
    setSelected(new Set());
    setShowConfirm(false);
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === consignments.length) setSelected(new Set());
    else setSelected(new Set(consignments.map((c) => c.id)));
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setIsDeleting(true);
    try {
      const supabase = createClient();
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("consignments")
        .update({ is_deleted: true, deleted_at: now })
        .in("id", Array.from(selected));
      if (error) throw error;
      exit();
      router.refresh();
    } catch {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  if (consignments.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No consignments yet"
          description="Create a consignment to track cattle sent to a processor. Allocate herds, link kill sheets, and record sales."
          actionLabel="New Consignment"
          actionHref="/dashboard/tools/grid-iq/consignments/new"
          variant="indigo"
        />
      </Card>
    );
  }

  const allSelected =
    consignments.length > 0 && selected.size === consignments.length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        {selecting ? (
          <button
            onClick={toggleAll}
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-text-primary"
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                allSelected
                  ? "border-indigo-400 bg-indigo-400 text-black"
                  : "border-white/20 bg-white/[0.04]"
              }`}
            >
              {allSelected && (
                <Check className="h-3 w-3" strokeWidth={3} />
              )}
            </span>
            Select All ({consignments.length})
            {selected.size > 0 && (
              <span className="ml-2 text-indigo-400">
                {selected.size} selected
              </span>
            )}
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <Link href="/dashboard/tools/grid-iq/consignments/new">
            <Button variant="indigo" size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              New
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className={`border bg-white/[0.04] hover:bg-white/[0.06] ${selecting ? "border-indigo-400/40 text-indigo-400 hover:text-indigo-400" : "border-white/[0.08] text-text-muted hover:border-white/[0.14]"}`}
            onClick={() => (selecting ? exit() : setSelecting(true))}
          >
            {selecting ? "Cancel" : "Select"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="divide-y divide-white/[0.06] p-0">
          {consignments.map((c) => {
            const badge = statusBadge(c.status);
            const checked = selected.has(c.id);

            const content = (
              <>
                {selecting && (
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                      checked
                        ? "border-indigo-400 bg-indigo-400 text-black"
                        : "border-white/20 bg-white/[0.04]"
                    }`}
                  >
                    {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                )}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15">
                  <Truck className="h-5 w-5 text-indigo-400" />
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
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                </div>
                {c.total_gross_value != null && c.total_gross_value > 0 && (
                  <span className="text-sm font-semibold text-emerald-400">
                    ${Math.round(c.total_gross_value).toLocaleString()}
                  </span>
                )}
                {!selecting && (
                  <ChevronRight className="h-4 w-4 shrink-0 text-text-muted transition-all group-hover:translate-x-0.5 group-hover:text-text-secondary" />
                )}
              </>
            );

            if (selecting) {
              return (
                <button
                  key={c.id}
                  onClick={() => toggleOne(c.id)}
                  className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.03]"
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={c.id}
                href={`/dashboard/tools/grid-iq/consignments/${c.id}`}
                className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03]"
              >
                {content}
              </Link>
            );
          })}
        </CardContent>
      </Card>

      {selecting && selected.size > 0 && (
        <div className="mt-4">
          {showConfirm ? (
            <div className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
              <span className="text-sm text-red-400">
                Delete {selected.size}{" "}
                {selected.size === 1 ? "consignment" : "consignments"}?
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Confirm
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full text-red-400 hover:bg-red-500/10 hover:text-red-400"
              onClick={() => setShowConfirm(true)}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete Selected ({selected.size})
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
