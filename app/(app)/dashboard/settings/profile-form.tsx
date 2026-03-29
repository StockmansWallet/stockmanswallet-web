"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateProfile } from "./actions";
import { roleDisplayName } from "@/lib/types/advisory";

export function ProfileForm({
  email,
  firstName,
  lastName,
  role,
}: {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}) {
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const result = await updateProfile(formData);

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
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
              : "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          id="first_name"
          name="first_name"
          label="First Name"
          defaultValue={firstName}
          placeholder="First name"
        />
        <Input
          id="last_name"
          name="last_name"
          label="Last Name"
          defaultValue={lastName}
          placeholder="Last name"
        />
      </div>

      <Input
        id="email"
        label="Email"
        value={email}
        disabled
        helperText="Email cannot be changed"
      />

      <Input
        id="role_display"
        label="Role"
        value={roleDisplayName(role) || "Producer"}
        disabled
        helperText="Role is set during onboarding and cannot be changed"
      />
      <input type="hidden" name="role" value={role || "producer"} />

      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Save Profile"}
      </Button>
    </form>
  );
}
