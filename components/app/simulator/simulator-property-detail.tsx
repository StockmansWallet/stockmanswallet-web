"use client";

import { useState, useTransition } from "react";
import type { Property, HerdGroup } from "@/lib/types/models";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FlaskConical,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  Loader2,
  Plus,
} from "lucide-react";
import {
  deleteSandboxHerd,
  updateSandboxHerd,
} from "@/app/(app)/dashboard/advisor/simulator/actions";
import { AddSandboxHerdDialog } from "./add-sandbox-herd-dialog";

interface SimulatorPropertyDetailProps {
  property: Property;
  herds: HerdGroup[];
}

export function SimulatorPropertyDetail({
  property,
  herds,
}: SimulatorPropertyDetailProps) {
  const totalHead = herds.reduce((sum, h) => sum + h.head_count, 0);
  const [addHerdOpen, setAddHerdOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Simulation mode banner */}
      <div className="flex items-center gap-3 rounded-lg border border-[#FF5722]/30 bg-[#FF5722]/10 px-4 py-3">
        <FlaskConical className="h-5 w-5 text-[#FF5722]" />
        <div>
          <p className="text-sm font-semibold text-[#FF5722]">SIMULATION MODE</p>
          <p className="text-xs text-text-muted">
            Changes here do not affect real client data.
          </p>
        </div>
      </div>

      {/* Property header */}
      <Card className="border-[#FF5722]/20 bg-zinc-900/50">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <FlaskConical className="h-5 w-5 text-[#FF5722]" />
            <CardTitle className="text-xl text-text-primary">
              {property.property_name}
            </CardTitle>
            <Badge className="bg-[#FF5722]/15 text-[#FF5722] hover:bg-[#FF5722]/20">
              SANDBOX
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">
              {herds.length} herd{herds.length !== 1 ? "s" : ""} · {totalHead} total head
            </p>
            <Button
              size="sm"
              className="bg-[#FF5722] text-white hover:bg-[#FF5722]/90"
              onClick={() => setAddHerdOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Herd
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Herds */}
      {herds.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="flex flex-col items-center py-10">
            <p className="mb-1 text-sm font-semibold text-text-primary">
              No herds yet
            </p>
            <p className="mb-4 text-sm text-text-muted">
              Add a herd to start modelling.
            </p>
            <Button
              size="sm"
              className="bg-[#FF5722] text-white hover:bg-[#FF5722]/90"
              onClick={() => setAddHerdOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Herd
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {herds.map((herd) => (
            <HerdCard key={herd.id} herd={herd} />
          ))}
        </div>
      )}

      <AddSandboxHerdDialog
        open={addHerdOpen}
        onOpenChange={setAddHerdOpen}
        propertyId={property.id}
      />
    </div>
  );
}

// Individual herd card with expandable detail editing
function HerdCard({ herd }: { herd: HerdGroup }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Editable fields
  const [headCount, setHeadCount] = useState(String(herd.head_count));
  const [weight, setWeight] = useState(String(Math.round(herd.current_weight)));
  const [dwg, setDwg] = useState(String(herd.daily_weight_gain));
  const [mortality, setMortality] = useState(
    herd.mortality_rate != null ? String(Math.round(herd.mortality_rate * 100)) : ""
  );
  const [calvingRate, setCalvingRate] = useState(
    herd.is_breeder ? String(Math.round((herd.calving_rate > 1 ? herd.calving_rate : herd.calving_rate * 100))) : ""
  );
  const [isPending, startTransition] = useTransition();

  async function handleDelete() {
    if (!confirm(`Delete sandbox herd "${herd.name}"?`)) return;
    setDeleting(true);
    await deleteSandboxHerd(herd.id);
  }

  function handleSave() {
    startTransition(async () => {
      const updates: Parameters<typeof updateSandboxHerd>[1] = {};
      const newHead = parseInt(headCount);
      if (!isNaN(newHead) && newHead > 0) updates.head_count = newHead;

      const newWeight = parseFloat(weight);
      if (!isNaN(newWeight) && newWeight > 0) updates.current_weight = newWeight;

      const newDwg = parseFloat(dwg);
      if (!isNaN(newDwg) && newDwg >= 0) updates.daily_weight_gain = newDwg;

      if (mortality.trim() !== "") {
        const newMort = parseFloat(mortality);
        if (!isNaN(newMort)) updates.mortality_rate = newMort / 100;
      } else {
        updates.mortality_rate = null;
      }

      if (herd.is_breeder && calvingRate.trim() !== "") {
        const newCalv = parseFloat(calvingRate);
        if (!isNaN(newCalv)) updates.calving_rate = newCalv / 100;
      }

      await updateSandboxHerd(herd.id, updates);
    });
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="flex flex-1 items-center gap-2 text-left"
            onClick={() => setExpanded(!expanded)}
          >
            <div>
              <p className="text-sm font-semibold text-text-primary">
                {herd.name}
              </p>
              <p className="text-xs text-text-muted">
                {herd.head_count} head · {herd.breed}{" "}
                {herd.sub_category
                  ? `${herd.category} (${herd.sub_category})`
                  : herd.category}{" "}
                · {Math.round(herd.current_weight)} kg
              </p>
            </div>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-zinc-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-500" />
            )}
          </button>
          <Button
            variant="ghost"
            size="sm"
            className="ml-2 text-red-400 hover:bg-red-500/10"
            disabled={deleting}
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-5 pt-2">
          {/* Read-only summary */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow label="Species" value={herd.species} />
            <InfoRow label="Breed" value={herd.breed} />
            <InfoRow label="Category" value={herd.category} />
            <InfoRow label="Sex" value={herd.sex} />
            <InfoRow label="Age" value={`${herd.age_months} months`} />
            {herd.selected_saleyard && (
              <InfoRow label="Saleyard" value={herd.selected_saleyard} />
            )}
            {herd.is_breeder && (
              <InfoRow
                label="Calving Rate"
                value={`${Math.round((herd.calving_rate > 1 ? herd.calving_rate : herd.calving_rate * 100))}%`}
              />
            )}
            {herd.mortality_rate != null && (
              <InfoRow
                label="Mortality"
                value={`${(herd.mortality_rate * 100).toFixed(1)}%`}
              />
            )}
          </div>

          {/* Editable assumptions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-text-primary">
                Assumptions
              </p>
              <Badge className="bg-[#FF5722]/15 text-[#FF5722]">Editable</Badge>
            </div>
            <p className="text-xs text-text-muted">
              Adjust these values freely. Sandbox herds are isolated from real
              data.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <EditField
                label="Head Count"
                value={headCount}
                onChange={setHeadCount}
                type="number"
              />
              <EditField
                label="Weight (kg)"
                value={weight}
                onChange={setWeight}
                type="number"
              />
              <EditField
                label="DWG (kg/day)"
                value={dwg}
                onChange={setDwg}
                type="number"
                step="0.01"
              />
              <EditField
                label="Mortality %"
                value={mortality}
                onChange={setMortality}
                type="number"
                step="0.1"
                placeholder="e.g. 2"
              />
              {herd.is_breeder && (
                <EditField
                  label="Calving Rate %"
                  value={calvingRate}
                  onChange={setCalvingRate}
                  type="number"
                  step="1"
                />
              )}
            </div>

            <Button
              className="bg-[#FF5722] text-white hover:bg-[#FF5722]/90"
              size="sm"
              disabled={isPending}
              onClick={handleSave}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-sm font-medium text-text-primary">{value}</p>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  type = "text",
  step,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-text-muted">{label}</label>
      <Input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border-zinc-700 bg-zinc-800"
      />
    </div>
  );
}
