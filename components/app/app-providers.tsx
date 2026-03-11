"use client";

import type { ReactNode } from "react";
import { ViewModeProvider } from "@/lib/hooks/use-view-mode";
import type { ViewMode } from "@/lib/types/advisory";

export function AppProviders({
  defaultMode = "farmer",
  children,
}: {
  defaultMode?: ViewMode;
  children: ReactNode;
}) {
  return (
    <ViewModeProvider defaultMode={defaultMode}>
      {children}
    </ViewModeProvider>
  );
}
