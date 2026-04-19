"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Fence, MapPin, FileText, DollarSign } from "lucide-react";
import { updateSharingPermission } from "@/app/(app)/dashboard/advisory-hub/my-advisors/[id]/actions";
import type { SharingPermissions, SharingCategory } from "@/lib/types/advisory";

interface SharingPreferencesCardProps {
  connectionId: string;
  permissions: SharingPermissions;
  isActive: boolean;
}

const CATEGORIES: {
  key: SharingCategory;
  label: string;
  description: string;
  icon: typeof Fence;
}[] = [
  {
    key: "herds",
    label: "Herds",
    description: "Herd names, head counts, breeds, and weights",
    icon: Fence,
  },
  {
    key: "properties",
    label: "Properties",
    description: "Property names, locations, and regions",
    icon: MapPin,
  },
  {
    key: "reports",
    label: "Reports",
    description: "Portfolio reports and export data",
    icon: FileText,
  },
  {
    key: "valuations",
    label: "Valuations",
    description: "Portfolio valuations and market prices",
    icon: DollarSign,
  },
];

export function SharingPreferencesCard({
  connectionId,
  permissions,
  isActive,
}: SharingPreferencesCardProps) {
  const [local, setLocal] = useState<SharingPermissions>(permissions);

  const handleToggle = async (category: SharingCategory, enabled: boolean) => {
    const prev = { ...local };
    setLocal((p) => ({ ...p, [category]: enabled }));

    const result = await updateSharingPermission(connectionId, category, enabled);
    if (result?.error) {
      setLocal(prev);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shared Data</CardTitle>
        <p className="mt-1 text-xs leading-relaxed text-text-muted">
          {isActive
            ? "Choose which data categories your advisor can view. Changes take effect immediately."
            : "Enable data sharing on the Overview tab to configure what your advisor can access."}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {CATEGORIES.map(({ key, label, description, icon: Icon }) => (
            <div
              key={key}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-advisor/10">
                  <Icon className="h-4 w-4 text-advisor" />
                </div>
                <div>
                  <label
                    htmlFor={`share-${key}`}
                    className="text-sm font-medium text-text-primary"
                  >
                    {label}
                  </label>
                  <p className="text-xs text-text-muted">{description}</p>
                </div>
              </div>
              <Switch
                id={`share-${key}`}
                checked={local[key]}
                onChange={(checked) => handleToggle(key, checked)}
                disabled={!isActive}
                color="green"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
