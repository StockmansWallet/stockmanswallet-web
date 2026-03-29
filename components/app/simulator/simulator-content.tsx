"use client";

import { useState } from "react";
import Link from "next/link";
import type { Property, HerdGroup } from "@/lib/types/models";
import type { ConnectionRequest } from "@/lib/types/advisory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FlaskConical,
  Plus,
  Copy,
  Trash2,
  ChevronRight,
  SlidersHorizontal,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import { DuplicateClientDialog } from "./duplicate-client-dialog";
import { NewSandboxDialog } from "./new-sandbox-dialog";
import { deleteSandboxProperty } from "@/app/(app)/dashboard/advisor/simulator/actions";

interface SimulatorContentProps {
  properties: Property[];
  herds: HerdGroup[];
  connections: ConnectionRequest[];
  clientProfiles: { user_id: string; display_name: string; property_name: string | null }[];
}

export function SimulatorContent({
  properties,
  herds,
  connections,
  clientProfiles,
}: SimulatorContentProps) {
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [showNewSandbox, setShowNewSandbox] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function herdsForProperty(propertyId: string) {
    return herds.filter((h) => h.property_id === propertyId);
  }

  async function handleDelete(propertyId: string) {
    if (!confirm("Delete this sandbox property and all its herds?")) return;
    setDeletingId(propertyId);
    await deleteSandboxProperty(propertyId);
    setDeletingId(null);
  }

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

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          variant="secondary"
          className="border-[#FF5722]/30 text-[#FF5722] hover:bg-[#FF5722]/10"
          onClick={() => setShowDuplicate(true)}
        >
          <Copy className="mr-2 h-4 w-4" />
          Duplicate Client Data
        </Button>
        <Button
          variant="secondary"
          className="text-text-secondary hover:bg-zinc-800"
          onClick={() => setShowNewSandbox(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Sandbox Property
        </Button>
      </div>

      {/* Empty state */}
      {properties.length === 0 && (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="flex flex-col items-center py-12">
            <FlaskConical className="mb-4 h-12 w-12 text-zinc-600" />
            <h3 className="mb-2 text-lg font-semibold text-text-primary">
              No Sandbox Properties
            </h3>
            <p className="mb-6 max-w-md text-center text-sm text-text-muted">
              Duplicate a client&apos;s herds into a sandbox property, or create one
              from scratch to experiment with scenarios.
            </p>
            <Button
              className="bg-[#FF5722] text-white hover:bg-[#FF5722]/90"
              onClick={() => setShowDuplicate(true)}
            >
              <Copy className="mr-2 h-4 w-4" />
              Duplicate Client Data
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Feature highlights (when empty) */}
      {properties.length === 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Safe Sandbox"
            description="Experiment without affecting real portfolios"
          />
          <FeatureCard
            icon={<Copy className="h-5 w-5" />}
            title="Clone Client Data"
            description="Duplicate client herds for what-if modelling"
          />
          <FeatureCard
            icon={<SlidersHorizontal className="h-5 w-5" />}
            title="Adjust Freely"
            description="Change any assumption without consequences"
          />
          <FeatureCard
            icon={<BarChart3 className="h-5 w-5" />}
            title="Compare Outcomes"
            description="See how different scenarios play out"
          />
        </div>
      )}

      {/* Sandbox property cards */}
      {properties.map((property) => {
        const propHerds = herdsForProperty(property.id);
        const totalHead = propHerds.reduce((sum, h) => sum + h.head_count, 0);

        return (
          <Card
            key={property.id}
            className="border-[#FF5722]/20 bg-zinc-900/50"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Link
                  href={`/dashboard/advisor/simulator/${property.id}`}
                  className="flex items-center gap-3 hover:opacity-80"
                >
                  <FlaskConical className="h-5 w-5 text-[#FF5722]" />
                  <CardTitle className="text-lg text-text-primary">
                    {property.property_name}
                  </CardTitle>
                  <Badge className="bg-[#FF5722]/15 text-[#FF5722] hover:bg-[#FF5722]/20">
                    SANDBOX
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-zinc-500" />
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  disabled={deletingId === property.id}
                  onClick={() => handleDelete(property.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-text-muted">
                {propHerds.length} herd{propHerds.length !== 1 ? "s" : ""} · {totalHead} total head
              </p>
            </CardHeader>

            {propHerds.length > 0 && (
              <CardContent className="space-y-2 pt-0">
                {propHerds.map((herd) => (
                  <Link
                    key={herd.id}
                    href={`/dashboard/advisor/simulator/${property.id}?herd=${herd.id}`}
                    className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 px-4 py-3 transition-colors hover:border-zinc-700"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {herd.name}
                      </p>
                      <p className="text-xs text-text-muted">
                        {herd.head_count} head · {herd.breed} {herd.category}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-500" />
                  </Link>
                ))}

                {propHerds.length === 0 && (
                  <p className="py-4 text-center text-sm text-text-muted">
                    No herds in this sandbox yet. Tap to add herds.
                  </p>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Dialogs */}
      <DuplicateClientDialog
        open={showDuplicate}
        onOpenChange={setShowDuplicate}
        connections={connections}
        clientProfiles={clientProfiles}
      />
      <NewSandboxDialog
        open={showNewSandbox}
        onOpenChange={setShowNewSandbox}
      />
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
      <div className="mt-0.5 text-[#FF5722]">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <p className="text-xs text-text-muted">{description}</p>
      </div>
    </div>
  );
}
