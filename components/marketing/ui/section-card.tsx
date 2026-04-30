import { clsx } from "clsx";
import type { ReactNode } from "react";

interface SectionCardProps {
  children: ReactNode;
  className?: string;
  glowPosition?: string;
  glowSize?: string;
}

export default function SectionCard({
  children,
  className,
  glowPosition = "50% 18%",
  glowSize = "1120px 700px",
}: SectionCardProps) {
  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-[32px] border border-white/[0.10] bg-[#17130f] px-4 py-10 shadow-[0_32px_120px_rgba(0,0,0,0.52)] sm:px-8 sm:py-12 lg:px-10 xl:px-12",
        className
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            `radial-gradient(ellipse ${glowSize} at ${glowPosition}, color-mix(in srgb, var(--color-brand) 24%, transparent), color-mix(in srgb, var(--color-brand) 9%, transparent) 42%, transparent 74%), ` +
            "linear-gradient(180deg, #17130f 0%, #1b1812 40%, #18130f 72%, #120f0d 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_960px_640px_at_50%_42%,transparent_0%,rgba(8,7,6,0.08)_58%,rgba(8,7,6,0.32)_100%)]"
      />
      {children}
    </div>
  );
}
