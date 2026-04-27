"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  Home,
  Loader2,
  MapPin,
  Search,
  UserPlus,
  Users2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/app/user-avatar";
import {
  searchProducersForPeer,
  sendProducerConnectionRequest,
} from "@/app/(app)/dashboard/producer-network/directory/actions";

interface SearchResult {
  user_id: string;
  display_name: string;
  company_name: string | null;
  property_name: string | null;
  state: string | null;
  region: string | null;
  bio: string | null;
  avatar_url: string | null;
  primary_species: string | null;
  total_head: number;
  herd_size_bucket: "small" | "medium" | "large" | null;
  property_count: number;
}

const herdSizeLabel: Record<NonNullable<SearchResult["herd_size_bucket"]>, string> = {
  small: "Small herd",
  medium: "Medium herd",
  large: "Large herd",
};

function formatLocation(producer: SearchResult) {
  return [producer.region, producer.state].filter(Boolean).join(", ");
}

export function ProducerFindPanel() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    let cancelled = false;
    debounceRef.current = setTimeout(async () => {
      const { producers } = await searchProducersForPeer(trimmed);
      if (!cancelled) {
        setResults(producers);
        setSearching(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setError(null);
    if (value.trim().length < 2) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
  };

  const handleConnect = async (userId: string) => {
    setSendingTo(userId);
    setError(null);
    const result = await sendProducerConnectionRequest(userId);
    if ("error" in result && result.error) {
      setError(result.error);
    } else {
      setSentTo((prev) => new Set(prev).add(userId));
      router.refresh();
    }
    setSendingTo(null);
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="app-frosted-header relative z-10 flex min-h-[5.25rem] shrink-0 items-center border-b border-white/[0.06] px-5 py-4">
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-text-primary">Find producers</h2>
            <p className="mt-1 text-sm text-text-muted">
              Search by producer name, business, or property.
            </p>
          </div>
          <div className="relative w-full sm:max-w-sm">
            <Search
              className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Search producers..."
              aria-label="Search for a producer"
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              className="h-10 w-full rounded-full border border-white/[0.08] bg-surface-lowest pr-10 pl-10 text-sm text-text-primary placeholder:text-text-muted focus:border-producer-network/30 focus:ring-1 focus:ring-producer-network/20 focus:outline-none"
            />
            {searching && (
              <Loader2
                className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-text-muted"
                aria-hidden="true"
              />
            )}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {query.trim().length < 2 ? (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center px-6 text-center">
            <div>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-producer-network/10">
                <Search className="h-6 w-6 text-producer-network" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold text-text-primary">Search your producer network</p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-text-muted">
                Find another producer, send a connection request, and they&apos;ll appear in
                Awaiting Response while you wait.
              </p>
            </div>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-3">
            {results.map((producer) => {
              const sent = sentTo.has(producer.user_id);
              const location = formatLocation(producer);
              return (
                <div
                  key={producer.user_id}
                  className="overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl transition-colors hover:border-producer-network/25 hover:bg-producer-network/[0.06]"
                >
                  <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start">
                    <UserAvatar
                      name={producer.display_name}
                      avatarUrl={producer.avatar_url}
                      sizeClass="h-20 w-20"
                      initialClass="text-2xl font-bold"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-xl font-semibold text-text-primary">
                            {producer.display_name}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-text-secondary">
                            {producer.company_name && (
                              <span className="inline-flex items-center gap-1.5">
                                <Building2 className="h-4 w-4 text-text-muted" aria-hidden="true" />
                                {producer.company_name}
                              </span>
                            )}
                            {producer.property_name && (
                              <span className="inline-flex items-center gap-1.5">
                                <Home className="h-4 w-4 text-text-muted" aria-hidden="true" />
                                {producer.property_name}
                              </span>
                            )}
                            {location && (
                              <span className="inline-flex items-center gap-1.5">
                                <MapPin className="h-4 w-4 text-text-muted" aria-hidden="true" />
                                {location}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 lg:pt-0.5">
                          {sent ? (
                            <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-success/15 bg-success/10 px-4 text-[13px] font-semibold text-success">
                              <Check className="h-3.5 w-3.5" aria-hidden="true" />
                              Sent
                            </span>
                          ) : (
                            <Button
                              variant="producer-network"
                              size="sm"
                              onClick={() => handleConnect(producer.user_id)}
                              disabled={sendingTo === producer.user_id}
                              className="shrink-0"
                            >
                              <UserPlus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                              {sendingTo === producer.user_id ? "Sending..." : "Connect"}
                            </Button>
                          )}
                        </div>
                      </div>

                      {producer.bio && (
                        <div className="mt-4 border-t border-white/[0.06] pt-4">
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                            About
                          </p>
                          <p className="max-w-4xl text-sm leading-relaxed text-text-secondary">
                            {producer.bio}
                          </p>
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {producer.primary_species && (
                          <span className="inline-flex items-center rounded-full border border-producer-network/12 bg-producer-network/[0.08] px-3 py-1 text-xs font-medium text-producer-network-light">
                            {producer.primary_species}
                          </span>
                        )}
                        {producer.herd_size_bucket && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1 text-xs font-medium text-text-secondary">
                            <Users2 className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
                            {herdSizeLabel[producer.herd_size_bucket]}
                            {producer.total_head > 0 ? ` - ${producer.total_head.toLocaleString()} head` : ""}
                          </span>
                        )}
                        {producer.property_count > 0 && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1 text-xs font-medium text-text-secondary">
                            <Home className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
                            {producer.property_count === 1
                              ? "1 property"
                              : `${producer.property_count} properties`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : !searching ? (
          <p className="mt-10 text-center text-sm text-text-muted">
            No producers found matching &quot;{query}&quot;.
          </p>
        ) : null}

        {error && (
          <p role="alert" className="mt-4 text-sm text-error">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
