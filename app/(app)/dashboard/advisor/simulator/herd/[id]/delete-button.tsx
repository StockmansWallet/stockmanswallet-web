"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { deleteSandboxHerd } from "../../actions";

export function SimulatorDeleteHerdButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteSandboxHerd(id);
    if (result?.error) {
      setDeleting(false);
      setOpen(false);
    } else {
      router.push("/dashboard/advisor/simulator");
    }
  }

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Delete
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Delete Sandbox Herd" size="sm">
        <p className="mb-6 text-sm text-text-secondary">
          Are you sure you want to delete <strong>{name}</strong> from the sandbox?
        </p>
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            className="border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.06]"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete Herd"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
