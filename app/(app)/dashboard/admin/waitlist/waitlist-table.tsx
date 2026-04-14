"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Search, Trash2 } from "lucide-react";

interface WaitlistSignup {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  postcode: string | null;
  herd_size: string | null;
  property_count: string | null;
  interested_features: string[] | null;
  contact_opt_in: boolean;
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

const FEATURE_LABELS: Record<string, string> = {
  brangus: "Brangus AI",
  herd_valuation: "Herd Valuation",
  reports: "Reports",
  advisory_hub: "Advisory Hub",
  yard_book: "Yard Book",
  freight_iq: "Freight IQ",
  grid_iq: "Grid IQ",
  producer_network: "Producer Network",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface WaitlistTableProps {
  signups: WaitlistSignup[];
}

export function WaitlistTable({ signups }: WaitlistTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  const allSelected = filtered.length > 0 && filtered.every((s) => selected.has(s.id));

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((s) => s.id)));
    }
  }, [allSelected, filtered]);

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch("/api/admin/waitlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      if (res.ok) {
        setSelected(new Set());
        setConfirmDelete(false);
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar: delete action (left) + search (right) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <>
              <span className="text-sm text-text-secondary">
                {selected.size} selected
              </span>
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-red-500/15 px-3.5 text-[13px] font-semibold text-red-400 transition-all hover:bg-red-500/25 active:scale-[0.97] disabled:opacity-40 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deleting ? "Deleting..." : "Confirm Delete"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="inline-flex h-8 items-center rounded-full px-3 text-[13px] font-medium text-text-muted transition-colors hover:text-text-primary cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleDelete}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-red-500/15 px-3.5 text-[13px] font-semibold text-red-400 transition-all hover:bg-red-500/25 active:scale-[0.97] cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              )}
            </>
          )}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or postcode..."
            aria-label="Search waitlist"
            className="w-72 rounded-xl bg-surface pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all focus:ring-1 focus:ring-inset focus:ring-brand/60 focus:bg-surface-raised"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-surface-lowest">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 cursor-pointer rounded border-white/20 bg-surface accent-brand"
                />
              </th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Name</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Email</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Role</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Postcode</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Herd Size</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Properties</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Interested In</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-text-muted">Contact OK</th>
              <th className="px-4 py-3 text-xs font-medium text-text-muted">Signed Up</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-sm text-text-muted">
                  No waitlist signups yet.
                </td>
              </tr>
            ) : (
              filtered.map((signup) => (
                <tr
                  key={signup.id}
                  className={`border-b border-surface transition-colors ${
                    selected.has(signup.id) ? "bg-brand/5" : "hover:bg-surface-lowest"
                  }`}
                >
                  <td className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(signup.id)}
                      onChange={() => toggleOne(signup.id)}
                      className="h-4 w-4 cursor-pointer rounded border-white/20 bg-surface accent-brand"
                    />
                  </td>
                  <td className="px-4 py-3 text-text-primary">{signup.name || "\u2014"}</td>
                  <td className="px-4 py-3">
                    <a href={`mailto:${signup.email}`} className="text-brand hover:text-brand-light transition-colors">
                      {signup.email}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    {signup.role ? (
                      <Badge variant={ROLE_VARIANTS[signup.role] ?? "default"}>
                        {ROLE_LABELS[signup.role] ?? signup.role}
                      </Badge>
                    ) : (
                      "\u2014"
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-primary">{signup.postcode || "\u2014"}</td>
                  <td className="px-4 py-3 text-text-primary">
                    {signup.herd_size ? HERD_LABELS[signup.herd_size] ?? signup.herd_size : "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-text-primary">
                    {signup.property_count ? PROPERTY_LABELS[signup.property_count] ?? signup.property_count : "\u2014"}
                  </td>
                  <td className="px-4 py-3">
                    {signup.interested_features && signup.interested_features.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {signup.interested_features.map((f) => (
                          <Badge key={f} variant="default">
                            {FEATURE_LABELS[f] ?? f}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      "\u2014"
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {signup.contact_opt_in ? (
                      <Badge variant="success">Yes</Badge>
                    ) : (
                      <span className="text-text-muted">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{formatDate(signup.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
