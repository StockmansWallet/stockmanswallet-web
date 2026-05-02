import Link from "next/link";

export function FreightTabs({ active }: { active: "new" | "saved" }) {
  const tabs = [
    { key: "new", label: "New Estimate", href: "/dashboard/tools/freight" },
    { key: "saved", label: "Saved Estimates", href: "/dashboard/tools/freight/history" },
  ] as const;

  return (
    <div className="inline-flex rounded-full bg-white/[0.04] p-1 ring-1 ring-white/[0.08] ring-inset">
      {tabs.map((tab) => {
        const selected = active === tab.key;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={selected ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              selected
                ? "bg-freight-iq/20 text-freight-iq shadow-sm shadow-black/10"
                : "text-text-secondary hover:bg-white/[0.05] hover:text-text-primary"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
