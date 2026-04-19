import { redirect } from "next/navigation";

// The Producer Network landing at /dashboard/farmer-network is now the
// single inbox: stats, incoming requests, conversations, outgoing
// requests, discovery. This alias stays for anyone holding a bookmark or
// older deep-link and routes them to the same view.
export default function RedirectConnectionsToNetwork() {
  redirect("/dashboard/farmer-network");
}
