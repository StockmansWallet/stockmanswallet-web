"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { ViewMode } from "@/lib/types/advisory";

interface ViewModeContextValue {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

const ViewModeContext = createContext<ViewModeContextValue>({
  viewMode: "farmer",
  setViewMode: () => {},
});

const STORAGE_KEY = "sw-view-mode";

export function ViewModeProvider({
  defaultMode = "farmer",
  children,
}: {
  defaultMode?: ViewMode;
  children: ReactNode;
}) {
  const [viewMode, setViewModeState] = useState<ViewMode>(defaultMode);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "farmer" || stored === "advisor") {
      setViewModeState(stored);
    }
    setHydrated(true);
  }, []);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  };

  // Prevent flash of wrong mode during hydration
  if (!hydrated) {
    return (
      <ViewModeContext.Provider value={{ viewMode: defaultMode, setViewMode }}>
        {children}
      </ViewModeContext.Provider>
    );
  }

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  return useContext(ViewModeContext);
}
