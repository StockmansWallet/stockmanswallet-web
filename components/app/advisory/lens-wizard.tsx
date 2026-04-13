"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Save,
  Loader2,
  ArrowRight,
  ArrowLeft,
  FileText,
} from "lucide-react";
import {
  createLensReport,
  addHerdToLensReport,
  saveLensReport,
} from "@/app/(app)/dashboard/advisor/clients/[id]/lens-report-actions";
import { LensHerdCard, type HerdInfo, type HerdOverrideState } from "./lens-herd-card";

interface LensWizardProps {
  connectionId: string;
  herds: HerdInfo[];
  herdValues: Record<string, number>;
  onCancel: () => void;
}

interface SelectedHerd {
  herdId: string;
  overrides: HerdOverrideState;
}

const defaultOverrides: HerdOverrideState = {
  shading_percentage: 100,
  breed_premium_override: "",
  adwg_override: "",
  calving_rate_override: "",
  mortality_rate_override: "",
  head_count_adjustment: "",
  advisor_notes: "",
  regional_data: null,
};

export function LensWizard({
  connectionId,
  herds,
  herdValues,
  onCancel,
}: LensWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<"select" | "review">("select");
  const [selectedHerds, setSelectedHerds] = useState<SelectedHerd[]>([]);
  const [lensName, setLensName] = useState("");
  const [isSaving, startSaveTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Available herds (not yet selected)
  const availableHerds = herds.filter(
    (h) => !selectedHerds.some((s) => s.herdId === h.id)
  );

  function addHerd(herdId: string) {
    setSelectedHerds((prev) => [
      ...prev,
      { herdId, overrides: { ...defaultOverrides } },
    ]);
  }

  function removeHerd(index: number) {
    setSelectedHerds((prev) => prev.filter((_, i) => i !== index));
  }

  function updateOverrides(index: number, overrides: HerdOverrideState) {
    setSelectedHerds((prev) =>
      prev.map((s, i) => (i === index ? { ...s, overrides } : s))
    );
  }

  // Calculate running totals
  const totalBaseline = selectedHerds.reduce((sum, s) => {
    return sum + (herdValues[s.herdId] ?? 0);
  }, 0);

  function handleSave() {
    if (selectedHerds.length === 0) {
      setError("Please add at least one herd.");
      return;
    }
    if (!lensName.trim()) {
      setError("Please enter a name for this lens.");
      return;
    }
    setError(null);

    startSaveTransition(async () => {
      // 1. Create the lens report
      const createResult = await createLensReport(connectionId, lensName.trim());
      if (!createResult.success || !createResult.id) {
        setError(createResult.error ?? "Failed to create lens report");
        return;
      }

      const lensReportId = createResult.id;

      // 2. Add each herd with overrides
      for (const selected of selectedHerds) {
        const o = selected.overrides;
        const result = await addHerdToLensReport(
          lensReportId,
          connectionId,
          selected.herdId,
          {
            shading_percentage: o.shading_percentage,
            breed_premium_override: o.breed_premium_override.trim()
              ? parseFloat(o.breed_premium_override)
              : null,
            adwg_override: o.adwg_override.trim()
              ? parseFloat(o.adwg_override)
              : null,
            calving_rate_override: o.calving_rate_override.trim()
              ? parseFloat(o.calving_rate_override)
              : null,
            mortality_rate_override: o.mortality_rate_override.trim()
              ? parseFloat(o.mortality_rate_override)
              : null,
            head_count_adjustment: o.head_count_adjustment.trim()
              ? parseInt(o.head_count_adjustment)
              : null,
            advisor_notes: o.advisor_notes.trim() || null,
          }
        );
        if (!result.success) {
          setError(result.error ?? "Failed to add herd");
          return;
        }
      }

      // 3. Save (recalculate totals, set status = saved)
      const saveResult = await saveLensReport(connectionId, lensReportId);
      if (!saveResult.success || !saveResult.redirectUrl) {
        setError(saveResult.error ?? "Failed to save lens report");
        return;
      }

      // 4. Navigate to saved lens page
      router.push(saveResult.redirectUrl);
    });
  }

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="flex items-center gap-3">
        <StepIndicator
          number={1}
          label="Select & Adjust"
          active={step === "select"}
          complete={step === "review"}
        />
        <div className="h-px flex-1 bg-border" />
        <StepIndicator
          number={2}
          label="Review & Save"
          active={step === "review"}
          complete={false}
        />
      </div>

      {step === "select" && (
        <>
          {/* Running totals bar */}
          {selectedHerds.length > 0 && (
            <Card className="bg-[#2F8CD9]/5 border-[#2F8CD9]/20">
              <CardContent className="py-3 px-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-text-muted">
                      {selectedHerds.length} herd{selectedHerds.length !== 1 ? "s" : ""} selected
                    </span>
                    <span className="text-text-muted">·</span>
                    <span className="text-text-secondary">
                      Baseline:{" "}
                      <span className="font-semibold text-text-primary">
                        ${totalBaseline.toLocaleString("en-AU", { maximumFractionDigits: 0 })}
                      </span>
                    </span>
                  </div>
                  <Button
                    variant="advisor"
                    size="sm"
                    onClick={() => setStep("review")}
                    disabled={selectedHerds.length === 0}
                  >
                    Review
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Selected herd cards */}
          <div className="space-y-4">
            {selectedHerds.map((selected, index) => {
              const herd = herds.find((h) => h.id === selected.herdId);
              if (!herd) return null;
              return (
                <LensHerdCard
                  key={selected.herdId}
                  herd={herd}
                  connectionId={connectionId}
                  overrides={selected.overrides}
                  onOverridesChange={(o) => updateOverrides(index, o)}
                  onRemove={() => removeHerd(index)}
                  index={index}
                />
              );
            })}
          </div>

          {/* Add herd selector */}
          {availableHerds.length > 0 && (
            <Card>
              <CardContent className="py-4 px-5">
                <label className="text-xs font-medium text-text-muted mb-2 block">
                  {selectedHerds.length === 0
                    ? "Select a herd to begin"
                    : "Add another herd"}
                </label>
                <div className="flex items-center gap-3">
                  <select
                    id="herd-select"
                    className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-[#2F8CD9]/40"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        addHerd(e.target.value);
                        e.target.value = "";
                      }
                    }}
                  >
                    <option value="" disabled>
                      Choose a herd...
                    </option>
                    {availableHerds.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name || "Unnamed"} — {h.head_count} head · {h.breed}{" "}
                        {h.category} · ${(herdValues[h.id] ?? 0).toLocaleString("en-AU", { maximumFractionDigits: 0 })}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {herds.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-text-muted">
                  This client has no active herds to assess.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Bottom actions */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            {selectedHerds.length > 0 && (
              <Button
                variant="advisor"
                onClick={() => setStep("review")}
              >
                Review & Save
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}
          </div>
        </>
      )}

      {step === "review" && (
        <>
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep("select")}
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to editing
          </Button>

          {/* Lens name */}
          <Card>
            <CardContent className="py-4 px-5 space-y-3">
              <label className="text-xs font-medium text-text-muted">Lens Name</label>
              <Input
                value={lensName}
                onChange={(e) => setLensName(e.target.value)}
                placeholder="e.g. Q2 2026 Lending Assessment"
                className="border-border bg-surface text-base"
                maxLength={200}
              />
            </CardContent>
          </Card>

          {/* Summary table */}
          <Card>
            <CardContent className="py-4 px-5">
              <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#2F8CD9]" />
                Herd Summary
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-text-muted text-xs">
                      <th className="text-left font-medium pb-2 pr-4">Herd</th>
                      <th className="text-right font-medium pb-2 pr-4">Head</th>
                      <th className="text-right font-medium pb-2 pr-4">Baseline</th>
                      <th className="text-right font-medium pb-2 pr-4">Shading</th>
                      <th className="text-center font-medium pb-2">Overrides</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedHerds.map((selected) => {
                      const herd = herds.find((h) => h.id === selected.herdId);
                      if (!herd) return null;
                      const o = selected.overrides;
                      const overrideCount = [
                        o.breed_premium_override,
                        o.adwg_override,
                        o.calving_rate_override,
                        o.mortality_rate_override,
                        o.head_count_adjustment,
                      ].filter((v) => v.trim()).length;

                      return (
                        <tr key={selected.herdId} className="border-t border-border/50">
                          <td className="py-2 pr-4">
                            <div className="font-medium text-text-primary">{herd.name || "Unnamed"}</div>
                            <div className="text-xs text-text-muted">{herd.breed} {herd.category}</div>
                          </td>
                          <td className="py-2 pr-4 text-right text-text-secondary">
                            {o.head_count_adjustment.trim()
                              ? `${herd.head_count} + (${o.head_count_adjustment})`
                              : herd.head_count}
                          </td>
                          <td className="py-2 pr-4 text-right font-medium text-text-primary">
                            ${(herdValues[selected.herdId] ?? 0).toLocaleString("en-AU", { maximumFractionDigits: 0 })}
                          </td>
                          <td className="py-2 pr-4 text-right">
                            <Badge
                              className={
                                o.shading_percentage !== 100
                                  ? "bg-amber-500/15 text-amber-600"
                                  : "bg-surface-raised text-text-muted"
                              }
                            >
                              {o.shading_percentage}%
                            </Badge>
                          </td>
                          <td className="py-2 text-center">
                            {overrideCount > 0 ? (
                              <Badge className="bg-[#2F8CD9]/15 text-[#2F8CD9]">
                                {overrideCount} override{overrideCount !== 1 ? "s" : ""}
                              </Badge>
                            ) : (
                              <span className="text-xs text-text-muted">None</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border">
                      <td className="py-2 pr-4 font-semibold text-text-primary">Total</td>
                      <td className="py-2 pr-4 text-right font-semibold text-text-primary">
                        {selectedHerds.reduce((sum, s) => {
                          const h = herds.find((h) => h.id === s.herdId);
                          return sum + (h?.head_count ?? 0);
                        }, 0)}
                      </td>
                      <td className="py-2 pr-4 text-right font-semibold text-text-primary">
                        ${totalBaseline.toLocaleString("en-AU", { maximumFractionDigits: 0 })}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {/* Save actions */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep("select")}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
            <Button
              variant="advisor"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Lens
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function StepIndicator({
  number,
  label,
  active,
  complete,
}: {
  number: number;
  label: string;
  active: boolean;
  complete: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
          active
            ? "bg-[#2F8CD9] text-white"
            : complete
              ? "bg-[#2F8CD9]/20 text-[#2F8CD9]"
              : "bg-surface-raised text-text-muted"
        }`}
      >
        {complete ? "\u2713" : number}
      </div>
      <span
        className={`text-xs font-medium ${
          active ? "text-[#2F8CD9]" : "text-text-muted"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
