"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateBio } from "./actions";

export function BioForm({ bio, isAdvisor }: { bio: string; isAdvisor: boolean }) {
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const result = await updateBio(formData);

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
              ? "border-error/40 bg-error/10 text-error"
              : "border-success/40 bg-success/10 text-success"
          }`}
        >
          {message.text}
        </div>
      )}

      <Textarea
        id="bio"
        name="bio"
        label="About You"
        defaultValue={bio}
        placeholder={
          isAdvisor
            ? "Tell producers about your experience and services..."
            : "Tell other producers about your operation..."
        }
        rows={4}
      />

      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Save Bio"}
      </Button>
    </form>
  );
}
