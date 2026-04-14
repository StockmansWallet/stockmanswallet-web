"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { Search } from "lucide-react";

interface ProducerDirectorySearchProps {
  currentSearch: string;
  currentState: string;
}

export function ProducerDirectorySearch({ currentSearch, currentState }: ProducerDirectorySearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(currentSearch);

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/dashboard/advisor/directory?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams("q", searchValue);
  };

  return (
    <div className="mb-6">
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Search by name or property..."
          aria-label="Search producers"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onBlur={() => updateParams("q", searchValue)}
          className="w-full rounded-full bg-surface-lowest py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-white/10"
        />
      </form>
    </div>
  );
}
