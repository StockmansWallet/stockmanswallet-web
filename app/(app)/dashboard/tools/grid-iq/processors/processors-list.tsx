"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/client";
import { Factory, ChevronRight, Plus, Trash2, Loader2, MapPin, Check } from "lucide-react";

interface ProcessorRow {
  id: string;
  name: string;
  address: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  contact_name: string | null;
  contact_phone: string | null;
  is_primary: boolean;
  grid_count: number;
  kill_sheet_count: number;
  updated_at: string;
}

export function ProcessorsList({ processors }: { processors: ProcessorRow[] }) {
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
    if (selected.size === processors.length) setSelected(new Set());
    else setSelected(new Set(processors.map((p) => p.id)));
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setIsDeleting(true);
    try {
      const supabase = createClient();
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("processors")
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

  const headerActions = (
    <>
      <Link href="/dashboard/tools/grid-iq/processors/new">
        <Button variant="grid-iq" size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          New
        </Button>
      </Link>
      <Button
        variant="ghost"
        size="sm"
        className={`border bg-white/[0.04] hover:bg-white/[0.06] ${selecting ? "border-grid-iq/40 text-grid-iq hover:text-grid-iq" : "text-text-muted border-white/[0.08] hover:border-white/[0.14]"}`}
        onClick={() => (selecting ? exit() : setSelecting(true))}
        disabled={processors.length === 0}
      >
        {selecting ? "Cancel" : "Select"}
      </Button>
    </>
  );

  const header = (
    <PageHeader
      feature="grid-iq"
      title="Processors"
      titleClassName="text-2xl font-semibold text-text-primary"
      subtitle="Your processor directory, reused across grids and analyses"
      subtitleClassName="text-sm text-text-muted"
      compact
      actions={headerActions}
    />
  );

  if (processors.length === 0) {
    return (
      <div>
        {header}
        <Card>
          <EmptyState
            title="No processors yet"
            description="Add the processors you work with. Each processor stores a single copy of the address and contact details, and is reused every time you upload a grid or run an analysis."
            actionLabel="Add Processor"
            actionHref="/dashboard/tools/grid-iq/processors/new"
            variant="grid-iq"
          />
        </Card>
      </div>
    );
  }

  const allSelected = processors.length > 0 && selected.size === processors.length;

  return (
    <div>
      {header}
      {selecting && (
        <div className="mb-3">
          <button
            onClick={toggleAll}
            className="text-text-muted hover:text-text-primary inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs transition-colors hover:border-white/[0.14] hover:bg-white/[0.06]"
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                allSelected
                  ? "border-grid-iq bg-grid-iq text-black"
                  : "border-white/20 bg-white/[0.04]"
              }`}
            >
              {allSelected && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            Select All ({processors.length})
            {selected.size > 0 && (
              <span className="text-grid-iq ml-2">{selected.size} selected</span>
            )}
          </button>
        </div>
      )}

      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 34rem), 1fr))" }}
      >
        {processors.map((p) => {
          const checked = selected.has(p.id);
          const hasCoords = p.location_latitude != null && p.location_longitude != null;

          const content = (
            <>
              {selecting && (
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                    checked
                      ? "border-grid-iq bg-grid-iq text-black"
                      : "border-white/20 bg-white/[0.04]"
                  }`}
                >
                  {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
              )}
              <div className="bg-grid-iq/15 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <Factory className="text-grid-iq h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-text-primary text-sm font-medium">{p.name}</p>
                  {p.is_primary && (
                    <span className="bg-grid-iq/15 text-grid-iq rounded-full px-2 py-0.5 text-[10px] font-medium">
                      Primary
                    </span>
                  )}
                </div>
                <div className="text-text-muted mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                  {p.address && <span>{p.address}</span>}
                  {hasCoords ? (
                    <span className="text-grid-iq/70 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      coords set
                    </span>
                  ) : (
                    <span className="text-warning/80">no coords</span>
                  )}
                  <span>
                    {p.grid_count} grid{p.grid_count === 1 ? "" : "s"}
                  </span>
                  <span>
                    {p.kill_sheet_count} kill sheet
                    {p.kill_sheet_count === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              {!selecting && (
                <ChevronRight className="text-text-muted group-hover:text-text-secondary h-4 w-4 shrink-0 transition-all group-hover:translate-x-0.5" />
              )}
            </>
          );

          if (selecting) {
            return (
              <button
                key={p.id}
                onClick={() => toggleOne(p.id)}
                className="group relative flex w-full items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.07] bg-clip-padding px-4 py-4 text-left backdrop-blur-xl transition-colors duration-150 hover:border-grid-iq/35 hover:bg-grid-iq/[0.075] [backface-visibility:hidden] [transform:translateZ(0)]"
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={p.id}
              href={`/dashboard/tools/grid-iq/processors/${p.id}`}
              className="group relative flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.07] bg-clip-padding px-4 py-4 backdrop-blur-xl transition-colors duration-150 hover:border-grid-iq/35 hover:bg-grid-iq/[0.075] [backface-visibility:hidden] [transform:translateZ(0)]"
            >
              {content}
            </Link>
          );
        })}
      </div>

      {selecting && selected.size > 0 && (
        <div className="mt-4">
          {showConfirm ? (
            <div className="border-error/20 bg-error/5 flex items-center justify-between rounded-xl border px-4 py-3">
              <span className="text-error text-sm">
                Delete {selected.size} {selected.size === 1 ? "processor" : "processors"}?
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="border border-white/[0.08] bg-white/[0.04] text-xs hover:bg-white/[0.06]"
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
            <Button variant="destructive" className="w-full" onClick={() => setShowConfirm(true)}>
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete Selected ({selected.size})
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
