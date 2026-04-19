import { MarkNotificationsRead } from "@/components/app/mark-notifications-read";

// Mounted across all Producer Network routes. Clears the sidebar badge the
// moment the user lands on the feature and re-clears if a new message or
// connection request arrives while they are still inside the section.
export default function FarmerNetworkLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarkNotificationsRead types={["new_message", "new_connection_request"]} />
      {children}
    </>
  );
}
