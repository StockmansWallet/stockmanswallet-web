"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { useSidebarNotifications } from "./sidebar-notifications-provider";

interface SidebarBadgeProps {
  // Notification types this badge represents. Counts for the types are
  // summed and shown as a single pill.
  types: string[];
}

export function SidebarBadge({ types }: SidebarBadgeProps) {
  const { counts } = useSidebarNotifications();
  const total = types.reduce((sum, t) => sum + (counts[t] ?? 0), 0);

  const controls = useAnimationControls();
  const prevTotal = useRef(0);

  useEffect(() => {
    if (total > 0) {
      if (prevTotal.current === 0) {
        // Entry pop: larger overshoot to announce first arrival.
        controls.start({
          scale: [0, 1.45, 0.85, 1.15, 1],
          opacity: [0, 1, 1, 1, 1],
          transition: { duration: 0.55, times: [0, 0.35, 0.6, 0.8, 1], ease: "easeOut" },
        });
      } else if (total !== prevTotal.current) {
        // Update pulse: smaller pop when the count changes while already
        // visible, so a new arrival still draws the eye.
        controls.start({
          scale: [1, 1.3, 0.92, 1.08, 1],
          transition: { duration: 0.4, times: [0, 0.35, 0.65, 0.85, 1], ease: "easeOut" },
        });
      }
    }
    prevTotal.current = total;
  }, [total, controls]);

  return (
    <AnimatePresence>
      {total > 0 && (
        <motion.span
          key="badge"
          initial={{ scale: 0, opacity: 0 }}
          animate={controls}
          exit={{ scale: 0, opacity: 0, transition: { duration: 0.15, ease: "easeIn" } }}
          className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1.5 text-[10px] font-bold text-white"
          aria-label={`${total} unread`}
        >
          {total > 9 ? "9+" : total}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
