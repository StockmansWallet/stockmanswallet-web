"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Search, Trash2, Mail, MapPin, Layers, Building2, CheckCircle2 } from "lucide-react";

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
  insights: "Insights",
  markets: "Markets",
  advisor_lens: "Advisor Lens",
  scenarios: "Scenarios",
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
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-error/15 px-3.5 text-[13px] font-semibold text-error transition-all hover:bg-error/25 active:scale-[0.97] disabled:opacity-40 cursor-pointer"
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
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-error/15 px-3.5 text-[13px] font-semibold text-error transition-all hover:bg-error/25 active:scale-[0.97] cursor-pointer"
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

      {/* Select all */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="h-4 w-4 cursor-pointer rounded border-white/20 bg-surface accent-brand"
          />
          <span className="text-xs text-text-muted">Select all</span>
        </div>
      )}

      {/* Card list */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-white/[0.06] bg-surface-lowest px-4 py-12 text-center text-sm text-text-muted">
            No waitlist signups yet.
          </div>
        ) : (
          filtered.map((signup) => (
            <div
              key={signup.id}
              className={`rounded-xl border transition-colors ${
                selected.has(signup.id)
                  ? "border-brand/20 bg-brand/5"
                  : "border-white/[0.06] bg-surface-lowest hover:border-white/[0.1]"
              }`}
            >
              {/* Header row: checkbox + name + role + date */}
              <div className="flex items-start gap-3 px-4 pt-3.5 pb-1">
                <input
                  type="checkbox"
                  checked={selected.has(signup.id)}
                  onChange={() => toggleOne(signup.id)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-white/20 bg-surface accent-brand"
                />
                <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[15px] font-semibold text-text-primary truncate">
                        {signup.name || "Unknown"}
                      </span>
                      {signup.role && (
                        <Badge variant={ROLE_VARIANTS[signup.role] ?? "default"}>
                          {ROLE_LABELS[signup.role] ?? signup.role}
                        </Badge>
                      )}
                    </div>
                    <a
                      href={`mailto:${signup.email}`}
                      className="mt-0.5 flex items-center gap-1.5 text-[13px] text-brand hover:text-brand-light transition-colors"
                    >
                      <Mail className="h-3 w-3 shrink-0 opacity-60" />
                      {signup.email}
                    </a>
                  </div>
                  <span className="shrink-0 text-xs text-text-muted pt-0.5">
                    {formatDate(signup.created_at)}
                  </span>
                </div>
              </div>

              {/* Meta row */}
              <div className="mx-4 mt-2 border-t border-white/[0.06] pt-2.5 pb-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px]">
                  {signup.postcode && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-text-muted" />
                      <span className="text-text-muted">Postcode</span>
                      <span className="text-text-primary font-medium">{signup.postcode}</span>
                    </span>
                  )}
                  {signup.herd_size && (
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-text-muted" />
                      <span className="text-text-muted">Herd</span>
                      <span className="text-text-primary font-medium">
                        {HERD_LABELS[signup.herd_size] ?? signup.herd_size}
                      </span>
                    </span>
                  )}
                  {signup.property_count && (
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-text-muted" />
                      <span className="text-text-muted">Properties</span>
                      <span className="text-text-primary font-medium">
                        {PROPERTY_LABELS[signup.property_count] ?? signup.property_count}
                      </span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className={`h-3.5 w-3.5 ${signup.contact_opt_in ? "text-success" : "text-text-muted"}`} />
                    <span className="text-text-muted">Contact</span>
                    {signup.contact_opt_in ? (
                      <Badge variant="success">Yes</Badge>
                    ) : (
                      <span className="text-text-muted font-medium">No</span>
                    )}
                  </span>
                </div>

                {/* Feature badges */}
                {signup.interested_features && signup.interested_features.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {signup.interested_features.map((f) => (
                      <Badge key={f} variant="default">
                        {FEATURE_LABELS[f] ?? f}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
