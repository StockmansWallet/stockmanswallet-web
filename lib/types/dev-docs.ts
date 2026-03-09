export interface DevUpdate {
  id: string;
  platform: "ios" | "web";
  date: string;
  build_label: string | null;
  title: string;
  summary: string;
  detail: string | null;
  sort_order: number;
  created_at: string;
}

export interface TimelineDay {
  dateKey: string;
  dateLabel: string;
  entries: DevUpdate[];
}

/** Group flat DevUpdate rows into TimelineDay[] sorted by date descending. */
export function groupByDate(updates: DevUpdate[]): TimelineDay[] {
  const map = new Map<string, DevUpdate[]>();

  for (const u of updates) {
    const existing = map.get(u.date);
    if (existing) {
      existing.push(u);
    } else {
      map.set(u.date, [u]);
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
