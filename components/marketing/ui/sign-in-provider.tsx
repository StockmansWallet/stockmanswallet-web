"use client";

import { type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SignInModal } from "./sign-in-modal";

export function SignInProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const open = pathname === "/sign-in";

  function handleClose() {
    if (open) router.replace("/");
  }

  return (
    <>
      {children}
      <SignInModal open={open} onClose={handleClose} />
    </>
  );
}
