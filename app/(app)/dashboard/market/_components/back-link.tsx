import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function BackLink({ href, label = "Market" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="mb-3 inline-flex items-center gap-1.5 rounded-lg bg-surface-lowest px-2.5 py-1.5 text-xs font-medium text-text-secondary backdrop-blur-md transition-colors hover:text-text-primary"
    >
      <ChevronLeft className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
