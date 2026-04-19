import { MarkNotificationsRead } from "@/components/app/mark-notifications-read";

// Mounted across all Yard Book routes. Clears the overdue badge the
// moment the user lands on the feature and re-clears if the daily cron
// fires another overdue notification while they are inside the section.
export default function YardBookLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarkNotificationsRead types={["yard_book_overdue"]} />
      {children}
    </>
  );
}
