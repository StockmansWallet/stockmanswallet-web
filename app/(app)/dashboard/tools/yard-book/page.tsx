import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { YardBookTabs } from "@/components/app/yard-book-tabs";

export const metadata = { title: "Yard Book" };

export default async function YardBookPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const [{ data: items }, { data: herds }, { data: notes }] = await Promise.all([
    supabase
      .from("yard_book_items")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .order("event_date"),
    supabase
      .from("herds")
      .select("id, name, head_count")
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .eq("is_sold", false)
      .order("name"),
    supabase
      .from("yard_book_notes")
      .select("id, title, body, is_pinned, updated_at")
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false }),
  ]);

  const allItems = items ?? [];
  const allNotes = notes ?? [];

  const { tab } = await searchParams;
  const defaultTab: "reminders" | "notes" = tab === "notes" ? "notes" : "reminders";

  // Show the empty-state hero only when both lists are completely empty
  const isCompletelyEmpty = allItems.length === 0 && allNotes.length === 0;

  return (
    <div className="w-full max-w-[1680px]">
      <PageHeader
        feature="yard-book"
        title="Yard Book"
        titleClassName="text-4xl font-bold text-yard-book"
        subtitle="Top Pocket Stuff"
        subtitleClassName="text-sm font-medium text-text-secondary"
      />

      {isCompletelyEmpty ? (
        <Card>
          <EmptyState
            title="Nothing in your Yard Book yet"
            description="Add reminders for events, or jot quick notes in your pocketbook."
            actionLabel="Add Reminder"
            actionHref="/dashboard/tools/yard-book/new"
            variant="yard-book"
          />
        </Card>
      ) : (
        <YardBookTabs
          items={allItems}
          herds={herds ?? []}
          notes={allNotes}
          defaultTab={defaultTab}
        />
      )}
    </div>
  );
}
