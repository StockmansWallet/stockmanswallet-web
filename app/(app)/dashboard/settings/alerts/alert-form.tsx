"use client";

import { useMemo, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createAlert, updateAlert } from "./actions";
import type { AlertRow, OptionItem, SaleyardOption } from "./types";

type Mode = "create" | "edit";

interface AlertFormProps {
  mode: Mode;
  alert?: AlertRow;
  categoryOptions: OptionItem[];
  stateOptions: OptionItem[];
  saleyards: SaleyardOption[];
  onDone: () => void;
}

export function AlertForm({
  mode,
  alert,
  categoryOptions,
  stateOptions,
  saleyards,
  onDone,
}: AlertFormProps) {
  const [targetKind, setTargetKind] = useState<"category" | "saleyard">(
    alert?.target_kind ?? "category",
  );
  const [targetName, setTargetName] = useState<string>(
    alert?.target_name ?? (targetKind === "category" ? categoryOptions[0]?.value ?? "" : saleyards[0]?.name ?? ""),
  );
  const [stateFilter, setStateFilter] = useState<string>(alert?.state ?? "");
  const [comparator, setComparator] = useState<"above" | "below">(alert?.comparator ?? "above");
  const [thresholdDollars, setThresholdDollars] = useState<string>(
    alert ? (alert.threshold_cents / 100).toFixed(2) : "",
  );
  const [note, setNote] = useState<string>(alert?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const saleyardOptions = useMemo<OptionItem[]>(
    () =>
      saleyards.map((s) => ({
        value: s.name,
        label: s.state ? `${s.name} (${s.state})` : s.name,
      })),
    [saleyards],
  );

  function switchKind(next: "category" | "saleyard") {
    setTargetKind(next);
    if (next === "category") {
      setTargetName(categoryOptions[0]?.value ?? "");
    } else {
      setTargetName(saleyards[0]?.name ?? "");
      setStateFilter("");
    }
  }

  function submit(formEl: HTMLFormElement) {
    const fd = new FormData(formEl);
    // Ensure the controlled fields are present even if the inputs aren't
    // picked up by FormData (custom Select uses a hidden input internally).
    fd.set("target_kind", targetKind);
    fd.set("target_name", targetName);
    fd.set("state", targetKind === "category" ? stateFilter : "");
    fd.set("comparator", comparator);
    fd.set("threshold_dollars", thresholdDollars);
    fd.set("note", note);

    if (!targetName) {
      setError("Pick a target first.");
      return;
    }
    const dollars = Number(thresholdDollars);
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setError("Enter a valid threshold in dollars per kg.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const action = mode === "create" ? createAlert(fd) : updateAlert(alert!.id, fd);
      const result = await action;
      if (result?.error) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
      className="space-y-4"
    >
      {/* Target kind toggle */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-secondary">
          Target kind
        </label>
        <div className="inline-flex rounded-full bg-surface p-1 ring-1 ring-inset ring-white/[0.06]">
          {(["category", "saleyard"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => switchKind(k)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                targetKind === k
                  ? "bg-brand text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {k === "category" ? "Category" : "Saleyard"}
            </button>
          ))}
        </div>
      </div>

      {/* Target picker */}
      <Select
        label={targetKind === "category" ? "Category" : "Saleyard"}
        value={targetName}
        onChange={(e) => setTargetName(e.target.value)}
        options={targetKind === "category" ? categoryOptions : saleyardOptions}
        placeholder={targetKind === "category" ? "Select a category" : "Select a saleyard"}
        required
      />

      {/* State filter - only for categories */}
      {targetKind === "category" && (
        <Select
          label="State filter"
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          options={stateOptions}
          helperText="Restrict the alert to a single state, or leave as All of Australia."
        />
      )}

      {/* Comparator pill */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-secondary">
          Trigger when price is
        </label>
        <div className="inline-flex rounded-full bg-surface p-1 ring-1 ring-inset ring-white/[0.06]">
          {(["above", "below"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setComparator(c)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                comparator === c
                  ? "bg-brand text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {c === "above" ? "Above" : "Below"}
            </button>
          ))}
        </div>
      </div>

      {/* Threshold */}
      <Input
        label="Threshold ($/kg)"
        type="number"
        step="0.01"
        min="0"
        placeholder="e.g. 4.25"
        value={thresholdDollars}
        onChange={(e) => setThresholdDollars(e.target.value)}
        required
      />

      {/* Note */}
      <Input
        label="Note (optional)"
        type="text"
        maxLength={500}
        placeholder="Why are you watching this?"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      {error && <p className="text-xs text-error">{error}</p>}

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : mode === "create" ? "Create alert" : "Save changes"}
        </Button>
        <Button variant="ghost" type="button" onClick={onDone} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
