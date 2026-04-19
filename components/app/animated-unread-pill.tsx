"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";

interface AnimatedUnreadPillProps {
  count: number;
  // Tailwind classes for absolute placement on top of the parent. The
  // parent needs `relative` for this to anchor correctly.
  className?: string;
}

// Shared red pill with a bouncy entry and a smaller pop-on-count-change.
// Used on sidebar nav items and on per-conversation avatars so the two
// surfaces feel like the same object at different sizes.
export function AnimatedUnreadPill({ count, className }: AnimatedUnreadPillProps) {
  const controls = useAnimationControls();
  const prevCount = useRef(0);

  useEffect(() => {
    if (count > 0) {
      if (prevCount.current === 0) {
        controls.start({
          scale: [0, 1.45, 0.85, 1.15, 1],
          opacity: [0, 1, 1, 1, 1],
          transition: { duration: 0.55, times: [0, 0.35, 0.6, 0.8, 1], ease: "easeOut" },
        });
      } else if (count !== prevCount.current) {
        controls.start({
          scale: [1, 1.3, 0.92, 1.08, 1],
          transition: { duration: 0.4, times: [0, 0.35, 0.65, 0.85, 1], ease: "easeOut" },
        });
      }
    }
    prevCount.current = count;
  }, [count, controls]);

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          key="pill"
          initial={{ scale: 0, opacity: 0 }}
          animate={controls}
          exit={{ scale: 0, opacity: 0, transition: { duration: 0.15, ease: "easeIn" } }}
          className={`pointer-events-none absolute flex items-center justify-center rounded-full bg-error font-bold text-white ${className ?? ""}`}
          aria-label={`${count} unread`}
        >
          {count > 9 ? "9+" : count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
