import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus } from "lucide-react";

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
            <Button>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Item
            </Button>
          </Link>
        }
      />

      {/* Category filter pills */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
              cat === "All"
                ? "bg-brand/15 text-brand ring-1 ring-inset ring-brand/25"
                : "bg-white/5 text-text-muted ring-1 ring-inset ring-white/8 hover:bg-white/8 hover:text-text-secondary"
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
