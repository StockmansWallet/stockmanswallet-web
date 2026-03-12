"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { updateVisibility } from "./actions";

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
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const result = await updateVisibility(formData);

    if (result?.error) {
      setMessage({ type: "error", text: result.error });
    } else if (result?.success) {
      setMessage({ type: "success", text: result.success });
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === "error"
              ? "border-red-800 bg-red-900/20 text-red-400"
              : "border-green-800 bg-green-900/20 text-green-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {isAdvisor ? (
        <Switch
          id="is_listed_in_directory"
          name="is_listed_in_directory"
          defaultChecked={isListedInDirectory}
          label="List in Advisor Directory"
          description="Farmers can find you when browsing or searching the directory."
        />
      ) : (
        <>
          <Switch
            id="is_discoverable"
            name="is_discoverable"
            defaultChecked={isDiscoverable}
            label="Visible to Advisors"
            description="Your accountant, banker, or agent can find you by name or property."
          />

          <Switch
            id="is_discoverable_to_farmers"
            name="is_discoverable_to_farmers"
            defaultChecked={isDiscoverableToFarmers}
            label="Visible to Farmers"
            description="Other farmers on Stockman's Wallet can find you in the Farmer Network."
          />
        </>
      )}

      <p className="text-xs text-text-muted leading-relaxed">
        {isAdvisor
          ? "Control whether farmers can find you in the advisor directory."
          : "Control who can find you on Stockman's Wallet. You can turn these off at any time."}
      </p>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Save Visibility"}
      </Button>
    </form>
  );
}
