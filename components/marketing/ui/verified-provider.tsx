"use client";

import { type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { VerifiedModal } from "./verified-modal";

export function VerifiedProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const open = pathname === "/auth/verified";

  function handleClose() {
    if (open) router.replace("/");
  }

  return (
    <>
      {children}
      <VerifiedModal open={open} onClose={handleClose} />
    </>
  );
}
