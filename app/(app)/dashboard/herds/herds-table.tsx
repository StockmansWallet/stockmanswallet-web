"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";

type HerdWithProperty = {
  id: string;
  name: string;
  species: string;
  breed: string;
  category: string;
  sex: string;
  head_count: number;
  current_weight: number;
  properties: { property_name: string } | null;
  [key: string]: unknown;
};

const SPECIES_TABS = ["All", "Cattle", "Sheep", "Pig", "Goat"] as const;

const speciesBadgeVariant: Record<string, "brand" | "success" | "info" | "warning"> = {
  Cattle: "brand",
  Sheep: "success",
  Pig: "info",
  Goat: "warning",
};

const columns: Column<HerdWithProperty>[] = [
  {
    key: "name",
    header: "Name",
    sortable: true,
    render: (row) => (
      <span className="font-medium">{row.name}</span>
    ),
  },
  {
    key: "species",
    header: "Species",
    sortable: true,
    render: (row) => (
      <Badge variant={speciesBadgeVariant[row.species] ?? "default"}>
        {row.species}
      </Badge>
    ),
  },
  { key: "breed", header: "Breed", sortable: true },
  { key: "category", header: "Category", sortable: true },
  {
    key: "head_count",
    header: "Head",
    sortable: true,
    className: "text-right",
    render: (row) => row.head_count?.toLocaleString() ?? "—",
  },
  {
    key: "current_weight",
    header: "Weight (kg)",
    sortable: true,
    className: "text-right",
    render: (row) =>
      row.current_weight ? `${row.current_weight.toLocaleString()} kg` : "—",
  },
  {
    key: "property",
    header: "Property",
    render: (row) => row.properties?.property_name ?? "—",
  },
];

export function HerdsTable({ herds }: { herds: HerdWithProperty[] }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("All");

  const filtered =
    activeTab === "All"
      ? herds
      : herds.filter((h) => h.species === activeTab);

  return (
    <div>
      {/* Species tabs */}
      <div className="flex gap-1 border-b border-black/5 px-4 dark:border-white/5">
        {SPECIES_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2.5 text-xs font-medium transition-colors ${
              activeTab === tab
                ? "border-b-2 border-brand text-brand"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        keyField="id"
        onRowClick={(row) => router.push(`/dashboard/herds/${row.id}`)}
        searchable
        searchPlaceholder="Search herds..."
        searchFields={["name", "breed", "category"]}
        emptyMessage="No herds found"
      />
    </div>
  );
}
