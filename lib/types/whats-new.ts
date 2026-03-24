export interface WhatsNewEntry {
  id: string;
  platform: "ios" | "web";
  date: string;
  build_label: string | null;
  title: string;
  summary: string;
  sort_order: number;
  created_at: string;
}

export interface WhatsNewDay {
  dateKey: string;
  dateLabel: string;
  entries: WhatsNewEntry[];
}

/** Group flat WhatsNewEntry rows into WhatsNewDay[] sorted by date descending. */
export function groupByDate(entries: WhatsNewEntry[]): WhatsNewDay[] {
  const map = new Map<string, WhatsNewEntry[]>();

  for (const e of entries) {
    const existing = map.get(e.date);
    if (existing) {
      existing.push(e);
    } else {
      map.set(e.date, [e]);
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, entries]) => ({
      dateKey,
      dateLabel: formatDateLabel(dateKey),
      entries,
    }));
}

/** "2026-03-09" -> "9 Mar 2026" */
function formatDateLabel(iso: string): string {
  const [year, month, day] = iso.split("-");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
}
