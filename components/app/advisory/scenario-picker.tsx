"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { createScenario, loadScenarioIntoLens, lockScenario, deleteScenario } from "@/app/(app)/dashboard/advisor/clients/[id]/lens-actions";
import { SCENARIO_TYPE_CONFIG, type AdvisorScenario, type ScenarioType } from "@/lib/types/advisor-lens";
import { Plus, Lock, Trash2, Upload, TrendingUp, Target, Shield, AlertTriangle, Landmark, SlidersHorizontal, Layers } from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "trending-up": TrendingUp,
  target: Target,
  shield: Shield,
  "alert-triangle": AlertTriangle,
  landmark: Landmark,
  "sliders-horizontal": SlidersHorizontal,
};

interface ScenarioPickerProps {
  connectionId: string;
  scenarios: AdvisorScenario[];
  activeLensScenarioId: string | null;
  advisorName: string;
}

export function ScenarioPicker({ connectionId, scenarios, activeLensScenarioId, advisorName }: ScenarioPickerProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [scenarioType, setScenarioType] = useState<ScenarioType>("custom");
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    const result = await createScenario(connectionId, { name: name.trim(), scenario_type: scenarioType });
    if (result?.error) setError(result.error);
    else {
      setShowCreate(false);
      setName("");
      setScenarioType("custom");
    }
    setCreating(false);
  }

  async function handleLoad(scenarioId: string) {
    setLoading(scenarioId);
    setError(null);
    const result = await loadScenarioIntoLens(connectionId, scenarioId);
    if (result?.error) setError(result.error);
    setLoading(null);
  }

  async function handleLock(scenarioId: string) {
    setError(null);
    const result = await lockScenario(connectionId, scenarioId, advisorName);
    if (result?.error) setError(result.error);
  }

  async function handleDelete(scenarioId: string) {
    setError(null);
    const result = await deleteScenario(connectionId, scenarioId);
    if (result?.error) setError(result.error);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2F8CD9]/15">
              <Layers className="h-3.5 w-3.5 text-[#2F8CD9]" />
            </div>
            <CardTitle>Scenarios</CardTitle>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="mr-1 h-3 w-3" />
            New
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {error && (
          <div className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>
        )}

        {scenarios.length === 0 ? (
          <p className="text-center text-sm text-text-muted py-4">
            No scenarios yet. Create one to save your current assumptions.
          </p>
        ) : (
          <div className="space-y-2">
            {scenarios.map((scenario) => {
              const config = SCENARIO_TYPE_CONFIG[scenario.scenario_type] ?? SCENARIO_TYPE_CONFIG.custom;
              const Icon = iconMap[config.icon] ?? SlidersHorizontal;
              const isActive = scenario.id === activeLensScenarioId;

              return (
                <div
                  key={scenario.id}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${
                    isActive ? "border-[#2F8CD9]/30 bg-[#2F8CD9]/5" : "border-white/5 bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-[#2F8CD9]" : "text-text-muted"}`} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">{scenario.name}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-text-muted">{config.label}</span>
                        {scenario.is_locked && (
                          <Badge variant="default" className="text-[10px]">
                            <Lock className="mr-0.5 h-2.5 w-2.5" />
                            Locked
                          </Badge>
                        )}
                        {isActive && <Badge variant="success" className="text-[10px]">Active</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="ml-2 flex items-center gap-1">
                    {!isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLoad(scenario.id)}
                        disabled={loading === scenario.id}
                        title="Load into lens"
                      >
                        <Upload className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {!scenario.is_locked && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => handleLock(scenario.id)} title="Lock scenario">
                          <Lock className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(scenario.id)} title="Delete scenario">
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Create scenario modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Scenario" size="sm">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Conservative Q2 2026"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">Type</label>
            <select
              value={scenarioType}
              onChange={(e) => setScenarioType(e.target.value as ScenarioType)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
            >
              {Object.entries(SCENARIO_TYPE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !name.trim()}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
