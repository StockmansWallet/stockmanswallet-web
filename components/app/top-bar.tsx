"use client";

import { ViewModeToggle } from "@/components/app/view-mode-toggle";

export function TopBar({ showViewToggle }: { showViewToggle?: boolean }) {
  if (!showViewToggle) return null;

  return (
    <div className="hidden lg:flex items-center justify-end px-8 pt-4">
      <ViewModeToggle />
    </div>
  );
}
