"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { signOut } from "./actions";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    const result = await signOut();
    if (result?.error) {
      alert(`Sign out failed: ${result.error}`);
      setPending(false);
    } else {
      router.push("/login");
    }
  }

  return (
    <Button
      variant="ghost"
      onClick={handleSignOut}
      disabled={pending}
      className="w-full justify-start gap-2.5 border border-white/[0.08] bg-white/[0.04] text-text-secondary hover:bg-white/[0.06] hover:text-text-primary"
    >
      <LogOut className="h-4 w-4" />
      {pending ? "Signing out..." : "Sign Out"}
    </Button>
  );
}
