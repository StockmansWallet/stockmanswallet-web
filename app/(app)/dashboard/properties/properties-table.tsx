"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Search, MapPinned, ChevronRight } from "lucide-react";

type Property = {
  id: string;
  property_name: string;
  suburb: string | null;
  postcode: string | null;
  state: string | null;
  property_pic: string | null;
  acreage: number | null;
  is_default: boolean;
  [key: string]: unknown;
};

export function PropertiesTable({
  properties,
  herdCounts,
  headCounts,
}: {
  properties: Property[];
  herdCounts: Record<string, number>;
  headCounts: Record<string, number>;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return properties;
    const q = search.toLowerCase();
    return properties.filter(
      (p) =>
        p.property_name.toLowerCase().includes(q) ||
        (p.suburb ?? "").toLowerCase().includes(q) ||
        (p.state ?? "").toLowerCase().includes(q) ||
        (p.property_pic ?? "").toLowerCase().includes(q)
    );
  }, [properties, search]);

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 rounded-full bg-surface-lowest px-2 py-2 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-brand/15 px-3.5 text-xs font-medium text-brand">
            All
            <span className="tabular-nums text-brand/70">{properties.length}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search properties..."
              aria-label="Search properties"
              className="h-8 w-full rounded-full bg-surface pl-9 pr-4 text-xs text-text-primary placeholder:text-text-muted outline-none transition-all focus:ring-2 focus:ring-brand/20 sm:w-48"
            />
          </div>
          <Link
            href="/dashboard/properties/new"
            className="inline-flex h-8 shrink-0 items-center rounded-full bg-brand px-3.5 text-xs font-medium text-white transition-all hover:bg-brand-dark"
          >
            Add Property
          </Link>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="overflow-hidden rounded-2xl bg-surface-lowest backdrop-blur-xl">
          <p className="px-5 py-16 text-center text-sm text-text-muted">
            {search ? "No properties match your search." : "No properties found."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-surface-lowest backdrop-blur-xl">
          <div className="divide-y divide-white/[0.06]">
            {filtered.map((property) => {
              const herds = herdCounts[property.id] ?? 0;
              const head = headCounts[property.id] ?? 0;

              return (
                <div
                  key={property.id}
                  onClick={() => router.push(`/dashboard/properties/${property.id}`)}
                  className="group flex cursor-pointer items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.03]"
                >
                  {/* Icon */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/15">
                    <MapPinned className="h-4 w-4 text-brand" />
                  </div>

                  {/* Name + details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-text-primary">{property.property_name}</p>
                      {property.is_default && (
                        <Badge variant="brand" className="text-[10px] px-1.5 py-0">Primary</Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-text-muted">
                      {[
                        property.suburb && property.postcode
                          ? `${property.suburb}, ${property.postcode}`
                          : property.suburb ?? property.postcode,
                        property.property_pic ? `PIC: ${property.property_pic}` : null,
                        property.acreage ? `${property.acreage.toLocaleString()} acres` : null,
                      ]
                        .filter(Boolean)
                        .join(" | ")}
                    </p>
                  </div>

                  {/* Right side: state badge + herd/head counts */}
                  <div className="flex shrink-0 items-center gap-3">
                    {herds > 0 && (
                      <span className="text-sm font-semibold tabular-nums text-brand">
                        {herds} {herds === 1 ? "herd" : "herds"}{head > 0 ? ` / ${head.toLocaleString()} head` : ""}
                      </span>
                    )}
                    {property.state && (
                      <Badge variant="default">{property.state}</Badge>
                    )}
                    <ChevronRight className="h-4 w-4 shrink-0 text-text-muted transition-all group-hover:translate-x-0.5 group-hover:text-text-secondary" />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-border-subtle px-5 py-3">
            <p className="text-xs text-text-muted">
              {filtered.length === properties.length
                ? `${properties.length} ${properties.length === 1 ? "property" : "properties"}`
                : `${filtered.length} of ${properties.length} properties`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
