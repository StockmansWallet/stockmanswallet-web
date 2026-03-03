import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Yard Book" };

const CATEGORIES = ["All", "Health", "Breeding", "Feed", "Maintenance", "Equipment", "Finance"];

export default function YardBookPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Yard Book"
        subtitle="Your digital run sheet. Top pocket stuff."
        actions={
          <Link href="/dashboard/tools/yard-book/new">
            <Button>Add Item</Button>
          </Link>
        }
      />

      {/* Category filter chips */}
      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              cat === "All"
                ? "bg-brand text-white"
                : "border border-black/10 bg-white text-text-secondary hover:bg-black/5 dark:border-white/10 dark:bg-white/5"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <Card>
        <EmptyState
          title="No yard book items"
          description="Add tasks, health records, breeding events, and more to your run sheet."
          actionLabel="Add Item"
          actionHref="/dashboard/tools/yard-book/new"
        />
      </Card>
    </div>
  );
}
