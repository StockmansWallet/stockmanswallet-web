import { clsx } from "clsx";
import type { ReactNode } from "react";

interface SectionCardProps {
  children: ReactNode;
  className?: string;
  glowPosition?: string;
  glowSize?: string;
  overflowVisible?: boolean;
}

export default function SectionCard({
  children,
  className,
  glowPosition = "50% 18%",
  glowSize = "1120px 700px",
  overflowVisible = false,
}: SectionCardProps) {
  return (
    <div
      className={clsx(
        "relative rounded-[32px] bg-[#17130f] px-4 py-10 shadow-[0_18px_48px_rgba(0,0,0,0.32)] sm:px-8 sm:py-12 lg:px-10 xl:px-12",
        overflowVisible ? "overflow-visible" : "overflow-hidden",
        className
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 rounded-[inherit]"
        style={{
          background:
            `radial-gradient(ellipse ${glowSize} at ${glowPosition}, color-mix(in srgb, var(--color-brand) 24%, transparent), color-mix(in srgb, var(--color-brand) 9%, transparent) 42%, transparent 74%), ` +
            "linear-gradient(180deg, #17130f 0%, #1b1812 40%, #18130f 72%, #120f0d 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] bg-[radial-gradient(ellipse_960px_640px_at_50%_42%,transparent_0%,rgba(8,7,6,0.08)_58%,rgba(8,7,6,0.32)_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] rounded-[32px] ring-1 ring-white/[0.12] ring-inset"
      />
      {children}
    </div>
  );
}
