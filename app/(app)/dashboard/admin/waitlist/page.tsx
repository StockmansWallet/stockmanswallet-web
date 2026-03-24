import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { isAdminEmail } from "@/lib/data/admin";
import { WaitlistTable } from "./waitlist-table";

export const metadata = { title: "Waitlist - Admin" };

export default async function WaitlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");
  if (!isAdminEmail(user.email)) redirect("/dashboard");

  const { data: signups, error } = await supabase
    .from("waitlist")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch waitlist:", error.message);
  }

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Waitlist"
        titleClassName="text-4xl font-bold text-cyan-400"
        subtitle={`${signups?.length ?? 0} signups`}
      />
      <WaitlistTable signups={signups ?? []} />
    </div>
  );
}
