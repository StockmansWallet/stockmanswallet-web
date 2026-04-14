"use client";

import { useState, useEffect, useRef } from "react";
import { Search, UserPlus, MapPin, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { searchProducers, sendAdvisorConnectionRequest } from "./actions";

interface SearchResult {
  user_id: string;
  display_name: string;
  company_name: string | null;
  state: string | null;
  region: string | null;
  property_name: string | null;
  bio: string | null;
}

export function ClientSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const { producers } = await searchProducers(query);
      setResults(producers);
      setSearching(false);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleConnect = async (userId: string) => {
    setSendingTo(userId);
    setError(null);
    const result = await sendAdvisorConnectionRequest(userId);
    if (result.error) {
      setError(result.error);
    } else {
      setSentTo((prev) => new Set(prev).add(userId));
    }
    setSendingTo(null);
  };

  return (
    <div className="mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Search for a producer by name or property..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl bg-surface py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-white/10"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-text-muted" />
        )}
      </div>

      {results.length > 0 && (
        <div className="mt-3 space-y-2">
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
                    {producer.property_name && (
                      <span className="text-text-muted/70">{producer.property_name}</span>
                    )}
                    {producer.state && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />
                        {producer.state}
                        {producer.region ? `, ${producer.region}` : ""}
                      </span>
                    )}
                  </div>
                  {producer.bio && (
                    <p className="mt-0.5 text-[11px] text-text-muted/60 line-clamp-1">{producer.bio}</p>
                  )}
                </div>
                {sentTo.has(producer.user_id) ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-400">
                    <Check className="h-3.5 w-3.5" />
                    Sent
                  </span>
                ) : (
                  <Button
                    variant="advisor"
                    size="sm"
                    onClick={() => handleConnect(producer.user_id)}
                    disabled={sendingTo === producer.user_id}
                  >
                    <UserPlus className="mr-1 h-3.5 w-3.5" />
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
          No producers found matching "{query}"
        </p>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
