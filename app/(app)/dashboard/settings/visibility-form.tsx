"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { updateVisibilityToggle } from "./actions";

export function VisibilityForm({
  isAdvisor,
  isDiscoverable,
  isDiscoverableToFarmers,
  isListedInDirectory,
}: {
  isAdvisor: boolean;
  isDiscoverable: boolean;
  isDiscoverableToFarmers: boolean;
  isListedInDirectory: boolean;
}) {
  const [values, setValues] = useState({
    is_discoverable: isDiscoverable,
    is_discoverable_to_farmers: isDiscoverableToFarmers,
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
        <div className="rounded-xl border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">
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
        <>
          <Switch
            id="is_discoverable"
            checked={values.is_discoverable}
            onChange={(c) => handleToggle("is_discoverable", c)}
            disabled={saving === "is_discoverable"}
            label="Visible to Advisors"
            description="Your accountant, banker, or agent can find you by name or property."
            color="blue"
          />

          <Switch
            id="is_discoverable_to_farmers"
            checked={values.is_discoverable_to_farmers}
            onChange={(c) => handleToggle("is_discoverable_to_farmers", c)}
            disabled={saving === "is_discoverable_to_farmers"}
            label="Visible to Producers"
            description="Other producers on Stockman's Wallet can find you in the Producer Network."
            color="green"
          />
        </>
      )}

      <p className="text-xs text-text-muted leading-relaxed">
        {isAdvisor
          ? "Control whether producers can find you in the advisor directory."
          : "Control who can find you on Stockman's Wallet. You can turn these off at any time."}
      </p>
    </div>
  );
}
