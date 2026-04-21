"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { updateVisibilityToggle } from "./actions";

/**
 * Discoverability controls for producers. The "Visible to Advisors" toggle
 * has been removed while advisor features are disabled for MVP; it will
 * return alongside the advisor re-enable flip (FeatureFlags.advisorEnabled).
 */
export function VisibilityForm({
  isAdvisor,
  isDiscoverableToProducers,
  isListedInDirectory,
}: {
  isAdvisor: boolean;
  isDiscoverableToProducers: boolean;
  isListedInDirectory: boolean;
}) {
  const [values, setValues] = useState({
    is_discoverable_to_producers: isDiscoverableToProducers,
    is_listed_in_directory: isListedInDirectory,
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle(field: keyof typeof values, checked: boolean) {
    setError(null);
    setSaving(field);
    setValues((prev) => ({ ...prev, [field]: checked }));

    const result = await updateVisibilityToggle(field, checked);

    if (result?.error) {
      setError(result.error);
      setValues((prev) => ({ ...prev, [field]: !checked }));
    }
    setSaving(null);
  }

  return (
    <div className="space-y-5">
      {error && (
        <div
          role="alert"
          className="border-error/40 bg-error/10 text-error rounded-xl border px-4 py-3 text-sm"
        >
          {error}
        </div>
      )}

      {isAdvisor ? (
        <Switch
          id="is_listed_in_directory"
          checked={values.is_listed_in_directory}
          onChange={(c) => handleToggle("is_listed_in_directory", c)}
          disabled={saving === "is_listed_in_directory"}
          label="List in Advisor Directory"
          description="Producers can find you when browsing or searching the directory."
          color="blue"
        />
      ) : (
        <Switch
          id="is_discoverable_to_producers"
          checked={values.is_discoverable_to_producers}
          onChange={(c) => handleToggle("is_discoverable_to_producers", c)}
          disabled={saving === "is_discoverable_to_producers"}
          label="Visible to Producers"
          description="Other producers on Stockman's Wallet can find you in the Producer Network."
          color="green"
        />
      )}

      <p className="text-text-muted text-xs leading-relaxed">
        {isAdvisor
          ? "Control whether producers can find you in the advisor directory."
          : "Control whether other producers can find you on Stockman's Wallet. You can turn this off at any time."}
      </p>
    </div>
  );
}
