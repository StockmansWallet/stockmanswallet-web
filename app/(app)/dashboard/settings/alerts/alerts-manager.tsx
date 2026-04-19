"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Switch } from "@/components/ui/switch";
import { AlertForm } from "./alert-form";
import { deleteAlert, toggleAlert } from "./actions";
import type { AlertRow, OptionItem, SaleyardOption } from "./types";

interface AlertsManagerProps {
  alerts: AlertRow[];
  categoryOptions: OptionItem[];
  stateOptions: OptionItem[];
  saleyards: SaleyardOption[];
}

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}/kg`;
}

function formatRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const day = 24 * 60 * 60 * 1000;
  const days = Math.floor(diffMs / day);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  return `${months} months ago`;
}

export function AlertsManager({
  alerts,
  categoryOptions,
  stateOptions,
  saleyards,
}: AlertsManagerProps) {
  const [formMode, setFormMode] = useState<"closed" | "create" | { kind: "edit"; id: string }>(
    "closed",
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm("Delete this alert? This cannot be undone.")) return;
    setPendingId(id);
    startTransition(async () => {
      await deleteAlert(id);
      setPendingId(null);
    });
  }

  function handleToggle(id: string, next: boolean) {
    setPendingId(id);
    startTransition(async () => {
      await toggleAlert(id, next);
      setPendingId(null);
    });
  }

  const editingId = typeof formMode === "object" ? formMode.id : null;
  const editingAlert = editingId ? alerts.find((a) => a.id === editingId) ?? null : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {alerts.length === 0
            ? "No alerts yet."
            : `${alerts.length} alert${alerts.length === 1 ? "" : "s"}`}
        </p>
        {formMode === "closed" && (
          <Button size="sm" onClick={() => setFormMode("create")}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New alert
          </Button>
        )}
        {formMode !== "closed" && (
          <Button variant="ghost" size="sm" onClick={() => setFormMode("closed")}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            Cancel
          </Button>
        )}
      </div>

      {formMode === "create" && (
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-4 text-sm font-semibold text-text-primary">New alert</h2>
            <AlertForm
              mode="create"
              categoryOptions={categoryOptions}
              stateOptions={stateOptions}
              saleyards={saleyards}
              onDone={() => setFormMode("closed")}
            />
          </CardContent>
        </Card>
      )}

      {editingAlert && (
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-4 text-sm font-semibold text-text-primary">Edit alert</h2>
            <AlertForm
              mode="edit"
              alert={editingAlert}
              categoryOptions={categoryOptions}
              stateOptions={stateOptions}
              saleyards={saleyards}
              onDone={() => setFormMode("closed")}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        {alerts.length === 0 ? (
          <EmptyState
            title="No alerts yet"
            description="Set a target price for a category or saleyard and we'll let you know when the market crosses it."
            actionLabel="Create alert"
            onAction={() => setFormMode("create")}
            variant="brand"
          />
        ) : (
          <CardContent className="divide-y divide-white/[0.06] p-0">
            {alerts.map((alert) => {
              const isEditing = editingId === alert.id;
              const isBusy = pendingId === alert.id;
              const statusLabel = alert.triggered_at
                ? `Last triggered ${formatRelative(alert.triggered_at)}`
                : alert.is_active
                  ? "Armed"
                  : "Paused";
              const subtitleBits = [
                alert.target_kind === "category"
                  ? alert.state
                    ? `Category - ${alert.state}`
                    : "Category - All AU"
                  : "Saleyard",
                `${alert.comparator === "above" ? "Above" : "Below"} ${formatDollars(alert.threshold_cents)}`,
              ];
              return (
                <div
                  key={alert.id}
                  className={`flex items-start justify-between gap-3 px-5 py-4 ${isEditing ? "bg-white/[0.02]" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {alert.target_name}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {subtitleBits.join(" \u00b7 ")}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {statusLabel}
                      {alert.last_observed_price_cents != null && (
                        <>
                          {" \u00b7 last seen "}
                          {formatDollars(alert.last_observed_price_cents)}
                        </>
                      )}
                    </p>
                    {alert.note && (
                      <p className="mt-1 truncate text-xs text-text-muted">{alert.note}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Switch
                      checked={alert.is_active}
                      disabled={isBusy}
                      onChange={(next) => handleToggle(alert.id, next)}
                      color="green"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => setFormMode({ kind: "edit", id: alert.id })}
                      aria-label="Edit alert"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => handleDelete(alert.id)}
                      aria-label="Delete alert"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
