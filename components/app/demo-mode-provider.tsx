"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  DEMO_OVERLAY_CHANGE_EVENT,
  DEMO_OVERLAY_STORAGE_KEY,
  readOverlay,
  type DemoLocalHerd,
} from "@/lib/demo-overlay";

type DemoModeValue = {
  isDemoUser: boolean;
  localHerds: DemoLocalHerd[];
};

const DemoModeContext = createContext<DemoModeValue>({
  isDemoUser: false,
  localHerds: [],
});

export function DemoModeProvider({
  isDemoUser,
  children,
}: {
  isDemoUser: boolean;
  children: React.ReactNode;
}) {
  const [localHerds, setLocalHerds] = useState<DemoLocalHerd[]>([]);

  useEffect(() => {
    if (!isDemoUser) {
      setLocalHerds([]);
      return;
    }
    const sync = () => setLocalHerds(readOverlay().herds);
    sync();
    const onCustom = () => sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === DEMO_OVERLAY_STORAGE_KEY || e.key === null) sync();
    };
    window.addEventListener(DEMO_OVERLAY_CHANGE_EVENT, onCustom);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(DEMO_OVERLAY_CHANGE_EVENT, onCustom);
      window.removeEventListener("storage", onStorage);
    };
  }, [isDemoUser]);

  return (
    <DemoModeContext.Provider value={{ isDemoUser, localHerds }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode(): DemoModeValue {
  return useContext(DemoModeContext);
}
