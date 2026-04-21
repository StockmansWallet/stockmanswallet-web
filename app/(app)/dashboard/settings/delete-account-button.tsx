"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Trash2 } from "lucide-react";
import { deleteAccount } from "./actions";

export function DeleteAccountButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setPending(true);
    setError(null);
    const result = await deleteAccount();
    if (result?.error) {
      setError(result.error);
      setPending(false);
    } else {
      router.push("/login");
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        className="border-error/30 bg-error/10 text-error hover:border-error/40 hover:bg-error/15 hover:text-error w-full justify-start gap-2.5 border"
      >
        <Trash2 className="h-4 w-4" />
        Delete Account
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Delete Account" size="sm">
        <div className="space-y-4">
          <p className="text-text-secondary text-sm leading-relaxed">
            This will permanently delete your account and all associated data including herds,
            properties, records, and settings. This action cannot be undone and affects both the web
            app and iOS app.
          </p>

          <div>
            <label className="text-text-secondary mb-1.5 block text-sm font-medium">
              Type <span className="text-error font-mono">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="text-text-primary placeholder:text-text-muted focus:ring-error/60 w-full rounded-xl bg-white/5 px-4 py-3 text-sm ring-1 ring-white/10 transition-all outline-none ring-inset"
            />
          </div>

          {error && (
            <div className="border-error/40 bg-error/10 text-error rounded-xl border px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={confirmText !== "DELETE" || pending}
            >
              {pending ? "Deleting..." : "Delete My Account"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
