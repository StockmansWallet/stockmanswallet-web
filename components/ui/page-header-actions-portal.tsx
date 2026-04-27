"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

function PageHeaderActionsPortal({ children }: { children: ReactNode }) {
  const target = useSyncExternalStore(subscribeToHeaderSlot, getHeaderSlot, getServerHeaderSlot);

  if (!target) return null;

  return createPortal(<>{children}</>, target);
}

function subscribeToHeaderSlot(callback: () => void) {
  if (typeof document === "undefined") return () => {};

  const frame = window.requestAnimationFrame(callback);
  const observer = new MutationObserver(callback);
  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    window.cancelAnimationFrame(frame);
    observer.disconnect();
  };
}

function getHeaderSlot() {
  if (typeof document === "undefined") return null;
  return document.getElementById("app-header-page-actions");
}

function getServerHeaderSlot() {
  return null;
}

export { PageHeaderActionsPortal };
