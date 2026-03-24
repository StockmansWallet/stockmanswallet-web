"use client";

import { useState, useMemo } from "react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Search } from "lucide-react";

interface WaitlistSignup extends Record<string, unknown> {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  postcode: string | null;
  herd_size: string | null;
  property_count: string | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  producer: "Producer",
  advisor: "Advisor",
  other: "Other",
};

const ROLE_VARIANTS: Record<string, BadgeVariant> = {
  producer: "success",
  advisor: "info",
  other: "default",
};

const HERD_LABELS: Record<string, string> = {
  under_50: "Under 50",
  "50_500": "50\u2013500",
  "500_2000": "500\u20132,000",
  "2000_plus": "2,000+",
};

const PROPERTY_LABELS: Record<string, string> = {
  "1": "1",
  "2_plus": "2+",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const columns: Column<Record<string, unknown>>[] = [
  {
    key: "name",
    header: "Name",
    sortable: true,
    render: (row) => (row.name as string) || "\u2014",
  },
  {
    key: "email",
    header: "Email",
    sortable: true,
    render: (row) => (
      <a href={`mailto:${row.email as string}`} className="text-brand hover:text-brand-light transition-colors">
        {row.email as string}
      </a>
    ),
  },
  {
    key: "role",
    header: "Role",
    sortable: true,
    render: (row) => {
      const role = row.role as string | null;
      return role ? (
        <Badge variant={ROLE_VARIANTS[role] ?? "default"}>
          {ROLE_LABELS[role] ?? role}
        </Badge>
      ) : (
        "\u2014"
      );
    },
  },
  {
    key: "postcode",
    header: "Postcode",
    sortable: true,
    render: (row) => (row.postcode as string) || "\u2014",
  },
  {
    key: "herd_size",
    header: "Herd Size",
    sortable: true,
    render: (row) => {
      const hs = row.herd_size as string | null;
      return hs ? HERD_LABELS[hs] ?? hs : "\u2014";
    },
  },
  {
    key: "property_count",
    header: "Properties",
    sortable: true,
    render: (row) => {
      const pc = row.property_count as string | null;
      return pc ? PROPERTY_LABELS[pc] ?? pc : "\u2014";
    },
  },
  {
    key: "created_at",
    header: "Signed Up",
    sortable: true,
    render: (row) => (
      <span className="text-text-muted">{formatDate(row.created_at as string)}</span>
    ),
  },
];

interface WaitlistTableProps {
  signups: WaitlistSignup[];
}

export function WaitlistTable({ signups }: WaitlistTableProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return signups;
    const q = search.toLowerCase();
    return signups.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.postcode?.toLowerCase().includes(q)
    );
  }, [signups, search]);

  return (
    <div className="flex flex-col gap-4">
      {/* Search above the card, aligned right */}
      <div className="flex justify-end">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or postcode..."
            className="w-72 rounded-xl bg-surface pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all focus:ring-1 focus:ring-inset focus:ring-brand/60 focus:bg-surface-raised"
          />
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-surface-lowest">
        <DataTable
          columns={columns}
          data={filtered as Record<string, unknown>[]}
          keyField="id"
          emptyMessage="No waitlist signups yet."
        />
      </div>
    </div>
  );
}
