"use client";

import type { ComponentType, ReactNode } from "react";
import { useState, useTransition } from "react";
import {
  BellRing,
  CheckCircle2,
  CircleDollarSign,
  Pencil,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { PageHeaderActionsPortal } from "@/components/ui/page-header-actions-portal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const activeAlerts = alerts.filter((alert) => alert.is_active).length;
  const triggeredAlerts = alerts.filter((alert) => alert.triggered_at).length;
  const showingForm = formMode !== "closed";

  return (
    <>
      <PageHeaderActionsPortal>
        {formMode === "closed" ? (
          <Button variant="markets" size="sm" onClick={() => setFormMode("create")}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New alert
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setFormMode("closed")}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            Cancel
          </Button>
        )}
      </PageHeaderActionsPortal>

      <div className="grid w-full max-w-[1400px] grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:self-start">
          <Card className="overflow-hidden">
            <div className="border-b border-white/[0.06] bg-white/[0.03] px-5 py-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-muted">
                Alert Desk
              </p>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-markets/20 bg-markets/15 text-markets">
                  <BellRing className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-text-primary">Market watch</p>
                  <p className="text-sm text-text-muted">
                    {alerts.length === 0
                      ? "No alerts configured yet."
                      : `${alerts.length} alert${alerts.length === 1 ? "" : "s"} configured.`}
                  </p>
                </div>
              </div>
            </div>
            <CardContent className="space-y-4 p-5">
              <SummaryLine
                icon={Target}
                label="Armed"
                value={String(activeAlerts)}
                tone="markets"
              />
              <SummaryLine
                icon={CheckCircle2}
                label="Triggered before"
                value={String(triggeredAlerts)}
                tone="success"
              />
              <SummaryLine
                icon={CircleDollarSign}
                label="Targets"
                value="$/kg"
                detail="Category or saleyard prices"
                tone="brand"
              />
              <p className="border-t border-white/[0.06] pt-4 text-xs leading-relaxed text-text-muted">
                Alerts are checked against recent market prices. Keep important rules armed and
                pause anything you are only watching casually.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-markets/15">
                  <TrendingUp className="h-3.5 w-3.5 text-markets" aria-hidden="true" />
                </div>
                <p className="text-sm font-semibold text-text-primary">Best for</p>
              </div>
              <p className="text-xs leading-relaxed text-text-muted">
                Use category alerts for broad market movement, and saleyard alerts when a specific
                selling location matters to your decision.
              </p>
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-4">
          {formMode === "create" && (
            <AlertFormCard title="New alert">
              <AlertForm
                mode="create"
                categoryOptions={categoryOptions}
                stateOptions={stateOptions}
                saleyards={saleyards}
                onDone={() => setFormMode("closed")}
              />
            </AlertFormCard>
          )}

          {editingAlert && (
            <AlertFormCard title="Edit alert">
              <AlertForm
                mode="edit"
                alert={editingAlert}
                categoryOptions={categoryOptions}
                stateOptions={stateOptions}
                saleyards={saleyards}
                onDone={() => setFormMode("closed")}
              />
            </AlertFormCard>
          )}

          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Alert Rules</CardTitle>
                  <p className="mt-1 text-xs text-text-muted">
                    Active, paused, and previously triggered price rules.
                  </p>
                </div>
                {showingForm && (
                  <span className="rounded-full bg-markets/15 px-3 py-1 text-xs font-semibold text-markets">
                    {formMode === "create" ? "Creating" : "Editing"}
                  </span>
                )}
              </div>
            </CardHeader>

            {alerts.length === 0 ? (
              <EmptyState
                title="No alerts yet"
                description="Set a target price for a category or saleyard and we'll let you know when the market crosses it."
                actionLabel={showingForm ? undefined : "Create alert"}
                onAction={showingForm ? undefined : () => setFormMode("create")}
                variant="markets"
              />
            ) : (
              <CardContent className="px-5 pb-5">
                <div className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                  {alerts.map((alert) => (
                    <AlertRuleRow
                      key={alert.id}
                      alert={alert}
                      isBusy={pendingId === alert.id}
                      isEditing={editingId === alert.id}
                      onToggle={handleToggle}
                      onEdit={(id) => setFormMode({ kind: "edit", id })}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function AlertFormCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-markets/15">
            <BellRing className="h-4 w-4 text-markets" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="mt-1 text-xs text-text-muted">
              Choose the market signal and the price that should trigger it.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">{children}</CardContent>
    </Card>
  );
}

function AlertRuleRow({
  alert,
  isBusy,
  isEditing,
  onToggle,
  onEdit,
  onDelete,
}: {
  alert: AlertRow;
  isBusy: boolean;
  isEditing: boolean;
  onToggle: (id: string, next: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
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
      className={`flex flex-col gap-4 px-4 py-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${
        isEditing ? "bg-markets/[0.06]" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-text-primary">{alert.target_name}</p>
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              alert.is_active ? "bg-success/15 text-success" : "bg-white/[0.05] text-text-muted"
            }`}
          >
            {statusLabel}
          </span>
        </div>
        <p className="mt-1 text-xs text-text-muted">{subtitleBits.join(" \u00b7 ")}</p>
        {alert.last_observed_price_cents != null && (
          <p className="mt-1 text-xs text-text-secondary">
            Last seen {formatDollars(alert.last_observed_price_cents)}
          </p>
        )}
        {alert.note && <p className="mt-1 truncate text-xs text-text-muted">{alert.note}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
        <Switch
          checked={alert.is_active}
          disabled={isBusy}
          onChange={(next) => onToggle(alert.id, next)}
          color="green"
        />
        <Button
          variant="ghost"
          size="sm"
          disabled={isBusy}
          onClick={() => onEdit(alert.id)}
          aria-label="Edit alert"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={isBusy}
          onClick={() => onDelete(alert.id)}
          aria-label="Delete alert"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function SummaryLine({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail?: string;
  tone: "brand" | "markets" | "success";
}) {
  const toneClass =
    tone === "success" ? "text-success" : tone === "markets" ? "text-markets" : "text-brand";
  const bgClass =
    tone === "success" ? "bg-success/15" : tone === "markets" ? "bg-markets/15" : "bg-brand/15";

  return (
    <div className="flex items-start gap-3">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bgClass}`}>
        <Icon className={`h-4 w-4 ${toneClass}`} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-text-muted">{label}</p>
        <p className={`mt-0.5 text-sm font-semibold ${toneClass}`}>{value}</p>
        {detail && <p className="mt-0.5 text-xs text-text-muted">{detail}</p>}
      </div>
    </div>
  );
}
