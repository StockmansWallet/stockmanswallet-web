"use client";

import { type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SignUpModal } from "./sign-up-modal";

export function SignUpProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const open = pathname === "/sign-up";

  function handleClose() {
    if (open) router.replace("/");
  }

  return (
    <>
      {children}
      <SignUpModal open={open} onClose={handleClose} />
    </>
  );
}
