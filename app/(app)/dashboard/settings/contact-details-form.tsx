"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateContactDetails } from "./actions";

export function ContactDetailsForm({
  contactEmail,
  contactPhone,
  companyName,
  propertyName,
  isAdvisor,
}: {
  contactEmail: string;
  contactPhone: string;
  companyName: string;
  propertyName: string;
  isAdvisor: boolean;
}) {
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const result = await updateContactDetails(formData);

    if (result?.error) {
      setMessage({ type: "error", text: result.error });
    } else if (result?.success) {
      setMessage({ type: "success", text: result.success });
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === "error"
              ? "border-red-800 bg-red-900/20 text-error"
              : "border-green-800 bg-green-900/20 text-success"
          }`}
        >
          {message.text}
        </div>
      )}

      <p className="text-xs text-text-muted leading-relaxed">
        {isAdvisor
          ? "These details are visible to producers in the directory when your listing is active."
          : "These details are visible when someone views your profile in the network or directory."}
      </p>

      <Input
        id="contact_email"
        name="contact_email"
        label="Contact Email"
        type="email"
        defaultValue={contactEmail}
        placeholder="email@example.com"
      />

      <Input
        id="contact_phone"
        name="contact_phone"
        label="Contact Phone"
        defaultValue={contactPhone}
        placeholder="04XX XXX XXX"
      />

      {isAdvisor ? (
        <Input
          id="company_name"
          name="company_name"
          label="Company Name"
          defaultValue={companyName}
          placeholder="Company name"
        />
      ) : (
        <Input
          id="property_name"
          name="property_name"
          label="Farm / Property Name"
          defaultValue={propertyName}
          placeholder="Property name"
        />
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Save Contact Details"}
      </Button>
    </form>
  );
}
