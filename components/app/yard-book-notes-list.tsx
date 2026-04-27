import Link from "next/link";
import { Pin, Plus, NotebookPen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

type Note = {
  id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  updated_at: string;
};

interface YardBookNotesListProps {
  notes: Note[];
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const startOfDay = (date: Date) => {
    const x = new Date(date);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const diffDays = Math.floor(
    (startOfDay(new Date()).getTime() - startOfDay(d).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) {
    return d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-AU", { weekday: "short" });
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function preview(note: Pick<Note, "title" | "body">): {
  displayTitle: string;
  previewText: string;
} {
  const trimmedTitle = note.title.trim();
  if (trimmedTitle) {
    return { displayTitle: trimmedTitle, previewText: note.body.trim() };
  }
  const lines = note.body.split(/\r?\n/);
  const firstLine = (lines[0] ?? "").trim();
  const rest = lines.slice(1).join(" ").trim();
  return { displayTitle: firstLine || "Untitled note", previewText: rest };
}

export function YardBookNotesList({ notes }: YardBookNotesListProps) {
  if (notes.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No notes yet"
          description="Jot down prices heard at the saleyard, agent phone numbers, or anything else you want to come back to later."
          actionLabel="New Note"
          actionHref="/dashboard/tools/yard-book/notes/new"
          variant="yard-book"
        />
      </Card>
    );
  }

  const pinned = notes.filter((n) => n.is_pinned);
  const unpinned = notes.filter((n) => !n.is_pinned);

  return (
    <div className="space-y-6">
      <div className="flex justify-end lg:hidden">
        <Link href="/dashboard/tools/yard-book/notes/new">
          <Button variant="yard-book" size="sm">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Note
          </Button>
        </Link>
      </div>

      {pinned.length > 0 && (
        <Section title="Pinned" icon={Pin}>
          <div className="space-y-2">
            {pinned.map((note) => (
              <NoteCard key={note.id} note={note} pinned />
            ))}
          </div>
        </Section>
      )}

      {unpinned.length > 0 && (
        <Section title="All notes" icon={NotebookPen}>
          <div className="space-y-2">
            {unpinned.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
        <Icon className="h-3 w-3" />
        {title}
      </div>
      {children}
    </section>
  );
}

function NoteCard({ note, pinned = false }: { note: Note; pinned?: boolean }) {
  const { displayTitle, previewText } = preview(note);
  return (
    <Link
      href={`/dashboard/tools/yard-book/notes/${note.id}/edit`}
      className="block rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 transition-colors hover:border-white/[0.10] hover:bg-white/[0.05]"
    >
      <div className="flex items-baseline gap-2">
        <h3 className="flex-1 truncate text-sm font-semibold text-text-primary">{displayTitle}</h3>
        {pinned && <Pin className="h-3 w-3 shrink-0 text-yard-book-light" />}
        <span className="shrink-0 text-[11px] text-text-muted">
          {relativeDate(note.updated_at)}
        </span>
      </div>
      {previewText && (
        <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{previewText}</p>
      )}
    </Link>
  );
}
