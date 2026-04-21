"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updatePassword } from "./actions";

export function PasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const result = await updatePassword(formData);

    if (result?.error) {
      setMessage({ type: "error", text: result.error });
    } else if (result?.success) {
      setMessage({ type: "success", text: result.success });
      formRef.current?.reset();
    }
    setSubmitting(false);
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          id="new_password"
          name="new_password"
          label="New Password"
          type="password"
          required
          minLength={6}
          placeholder="Min 6 characters"
        />
        <Input
          id="confirm_password"
          name="confirm_password"
          label="Confirm Password"
          type="password"
          required
          minLength={6}
          placeholder="Re-enter password"
        />
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Updating..." : "Update Password"}
      </Button>
    </form>
  );
}
