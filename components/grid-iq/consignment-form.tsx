// Consignment form - create/edit processor bookings with herd allocations.
// Client component for interactive herd allocation management.

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createConsignment } from "@/app/(app)/dashboard/tools/grid-iq/consignments/actions";
import {
  Truck,
  Users,
  Plus,
  Trash2,
  AlertCircle,
} from "lucide-react";

interface HerdOption {
  id: string;
  name: string;
  head_count: number;
  category: string | null;
  species: string | null;
}

interface GridOption {
  id: string;
  grid_name: string | null;
  processor_name: string;
  grid_code: string | null;
}

interface ConsignmentFormProps {
  herds: HerdOption[];
  grids: GridOption[];
}

interface Allocation {
  key: string;
  herdGroupId: string;
  headCount: number;
  category: string;
}

export function ConsignmentForm({ herds, grids }: ConsignmentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [allocations, setAllocations] = useState<Allocation[]>([
    { key: crypto.randomUUID(), herdGroupId: "", headCount: 1, category: "" },
  ]);

  const totalHead = allocations.reduce((sum, a) => sum + (a.headCount || 0), 0);

  // Herds already used in allocations (prevent duplicates)
  const usedHerdIds = new Set(allocations.map((a) => a.herdGroupId).filter(Boolean));

  function addAllocation() {
    setAllocations((prev) => [
      ...prev,
      { key: crypto.randomUUID(), herdGroupId: "", headCount: 1, category: "" },
    ]);
  }

  function removeAllocation(key: string) {
    setAllocations((prev) => prev.filter((a) => a.key !== key));
  }

  function updateAllocation(key: string, field: keyof Allocation, value: string | number) {
    setAllocations((prev) =>
      prev.map((a) => {
        if (a.key !== key) return a;
        const updated = { ...a, [field]: value };
        // Auto-populate category when herd is selected
        if (field === "herdGroupId") {
          const herd = herds.find((h) => h.id === value);
          if (herd) {
            updated.category = herd.category ?? "";
            updated.headCount = Math.min(updated.headCount, herd.head_count);
          }
        }
        return updated;
      }),
    );
  }

  function getMaxHead(herdId: string): number {
    const herd = herds.find((h) => h.id === herdId);
    return herd?.head_count ?? 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Validate allocations
    const validAllocations = allocations.filter((a) => a.herdGroupId && a.headCount > 0);
    if (validAllocations.length === 0) {
      setError("Add at least one herd allocation with head count.");
      return;
    }

    formData.set(
      "allocations",
      JSON.stringify(
        validAllocations.map((a) => ({
          herdGroupId: a.herdGroupId,
          headCount: a.headCount,
          category: a.category,
        })),
      ),
    );

    startTransition(async () => {
      const result = await createConsignment(formData);
      if (result.error) {
        setError(result.error);
      } else if (result.consignmentId) {
        router.push(`/dashboard/tools/grid-iq/consignments/${result.consignmentId}`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Processor Details */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15">
              <Truck className="h-4 w-4 text-indigo-400" />
            </div>
            <p className="text-sm font-semibold text-text-primary">Processor Details</p>
          </div>
          <div className="mb-4">
            <Input
              id="consignmentName"
              name="consignmentName"
              label="Consignment Name"
              placeholder="e.g. Cull Cows - Canal Creek Paddock"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="processorName"
              name="processorName"
              label="Processor Name"
              placeholder="e.g. JBS Dinmore"
              required
            />
            <Input
              id="plantLocation"
              name="plantLocation"
              label="Plant Location"
              placeholder="e.g. Dinmore, QLD"
            />
            <Input
              id="bookingReference"
              name="bookingReference"
              label="Booking Reference"
              placeholder="e.g. BK-2026-0042"
            />
            <Input
              id="killDate"
              name="killDate"
              label="Kill Date"
              type="date"
            />
            {grids.length > 0 && (
              <Select
                id="gridId"
                name="gridId"
                label="Linked Grid"
                placeholder="Select a grid (optional)"
                options={grids.map((g) => ({
                  value: g.id,
                  label: `${g.grid_name || g.processor_name}${g.grid_code ? ` - ${g.grid_code}` : ""}`,
                }))}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Herd Allocations */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15">
                <Users className="h-4 w-4 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Herd Allocations</p>
                <p className="text-xs text-text-muted">
                  Select herds and specify head count for this consignment
                </p>
              </div>
            </div>
            <span className="rounded-lg bg-indigo-500/15 px-2.5 py-1 text-xs font-semibold text-indigo-400">
              {totalHead} head
            </span>
          </div>

          <div className="space-y-3">
            {allocations.map((alloc, idx) => {
              const maxHead = getMaxHead(alloc.herdGroupId);
              const availableHerds = herds.filter(
                (h) => h.id === alloc.herdGroupId || !usedHerdIds.has(h.id),
              );

              return (
                <div
                  key={alloc.key}
                  className="flex items-end gap-3 rounded-xl bg-white/[0.02] p-3"
                >
                  <div className="min-w-0 flex-1">
                    <Select
                      id={`herd-${idx}`}
                      label="Herd"
                      placeholder="Select herd"
                      options={availableHerds.map((h) => ({
                        value: h.id,
                        label: `${h.name} (${h.head_count} head)`,
                      }))}
                      value={alloc.herdGroupId}
                      onChange={(e) =>
                        updateAllocation(alloc.key, "herdGroupId", e.target.value)
                      }
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      id={`head-${idx}`}
                      label="Head"
                      type="number"
                      min={1}
                      max={maxHead || undefined}
                      value={alloc.headCount}
                      onChange={(e) =>
                        updateAllocation(alloc.key, "headCount", parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="w-28">
                    <Input
                      id={`cat-${idx}`}
                      label="Category"
                      placeholder="e.g. Steers"
                      value={alloc.category}
                      onChange={(e) =>
                        updateAllocation(alloc.key, "category", e.target.value)
                      }
                    />
                  </div>
                  {allocations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAllocation(alloc.key)}
                      className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addAllocation}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/[0.08] py-2.5 text-xs font-medium text-text-muted transition-colors hover:border-indigo-500/30 hover:text-indigo-400"
          >
            <Plus className="h-3.5 w-3.5" />
            Add another herd
          </button>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent className="p-5">
          <label htmlFor="notes" className="mb-2 block text-xs font-medium text-text-secondary">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Any additional notes about this consignment..."
            className="w-full rounded-xl bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all ring-1 ring-inset ring-ring-subtle focus:ring-brand/60 focus:bg-surface-raised"
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/dashboard/tools/grid-iq/consignments")}
        >
          Cancel
        </Button>
        <Button type="submit" variant="indigo" disabled={isPending || totalHead === 0}>
          {isPending ? "Creating..." : "Create Consignment"}
        </Button>
      </div>
    </form>
  );
}
