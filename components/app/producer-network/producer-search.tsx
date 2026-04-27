"use client";

import { useState, useEffect, useRef } from "react";
import { Search, UserPlus, MapPin, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  searchProducersForPeer,
  sendProducerConnectionRequest,
} from "@/app/(app)/dashboard/producer-network/directory/actions";

interface SearchResult {
  user_id: string;
  display_name: string;
  company_name: string | null;
  state: string | null;
  region: string | null;
  bio: string | null;
}

/**
 * Inline producer search with quick-connect. Mirrors the ClientSearch
 * component used on the Advisor Clients page: debounced server query,
 * card results with a Connect button per row, tracks already-sent
 * requests locally so the UI gives immediate feedback.
 */
export function ProducerSearch() {
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
    }
    setSendingTo(null);
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="min-w-0">
            <p className="text-text-primary text-sm font-semibold">Find producers</p>
            <p className="text-text-muted mt-0.5 text-xs">
              Search by producer name or property.
            </p>
          </div>
          <div className="relative w-full">
            <Search
              className="text-text-muted absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Search producers..."
              aria-label="Search for a producer"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="bg-surface-lowest text-text-primary placeholder:text-text-muted focus:border-producer-network/30 focus:ring-producer-network/20 h-9 w-full rounded-full border border-white/[0.08] pr-9 pl-9 text-sm focus:ring-1 focus:outline-none"
            />
            {searching && (
              <Loader2
                className="text-text-muted absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 animate-spin"
                aria-hidden="true"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((producer) => (
            <Card key={producer.user_id} className="bg-surface">
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    {producer.display_name}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-muted">
                    {producer.company_name && (
                      <span>{producer.company_name}</span>
                    )}
                    {producer.state && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                        {producer.state}
                        {producer.region ? `, ${producer.region}` : ""}
                      </span>
                    )}
                  </div>
                  {producer.bio && (
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-text-muted">{producer.bio}</p>
                  )}
                </div>
                {sentTo.has(producer.user_id) ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-success">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    Sent
                  </span>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleConnect(producer.user_id)}
                    disabled={sendingTo === producer.user_id}
                  >
                    <UserPlus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    {sendingTo === producer.user_id ? "Sending..." : "Connect"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {query.trim().length >= 2 && !searching && results.length === 0 && (
        <p className="mt-3 text-center text-xs text-text-muted">
          No producers found matching &quot;{query}&quot;
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-error">{error}</p>
      )}
    </div>
  );
}
