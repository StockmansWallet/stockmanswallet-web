import { redirect } from "next/navigation";

export default function RedirectPage() {
  redirect("/dashboard/tools/grid-iq/library?tab=performance");
}
