import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/data/admin";
import { PageHeader } from "@/components/ui/page-header";
import { groupByDate } from "@/lib/types/dev-docs";
import type { DevUpdate } from "@/lib/types/dev-docs";
import { ChangelogTimeline } from "./changelog-timeline";

export const metadata = { title: "Changelog - Admin" };

export default async function ChangelogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (!isAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  const { data, error } = await supabase
    .from("dev_updates")
    .select("*")
    .order("date", { ascending: false })
    .order("platform")
    .order("sort_order", { ascending: false });

  const updates: DevUpdate[] = error ? [] : (data as DevUpdate[]);
  const timeline = groupByDate(updates);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Changelog"
        subtitle="iOS and web app build updates."
      />
      <ChangelogTimeline days={timeline} />
    </div>
  );
}
