"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { Search } from "lucide-react";
import { ADVISOR_CATEGORIES } from "@/lib/types/advisory";

interface DirectoryFiltersProps {
  currentCategory: string;
  currentSearch: string;
}

export function DirectoryFilters({ currentCategory, currentSearch }: DirectoryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(currentSearch);

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/dashboard/advisory-hub/directory?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams("q", searchValue);
  };

  const categories = [
    { key: "all", label: "All" },
    ...ADVISOR_CATEGORIES.map((c) => ({ key: c.key, label: c.label })),
  ];

  return (
    <div className="mb-6 space-y-3">
      {/* Category segmented control */}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-surface-lowest p-1">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => updateParams("category", cat.key)}
            className={`shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all duration-150 ${
              currentCategory === cat.key
                ? "bg-surface-high text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Search by name or company..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onBlur={() => updateParams("q", searchValue)}
          className="w-full rounded-xl bg-surface-lowest py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-white/10"
        />
      </form>
    </div>
  );
}
