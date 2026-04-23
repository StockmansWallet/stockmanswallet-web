import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { PageHeader } from "@/components/ui/page-header";
import { isAdminUser } from "@/lib/data/admin";
import { WaitlistTable } from "./waitlist-table";

export const metadata = { title: "Waitlist - Admin" };

export default async function WaitlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");
  if (!(await isAdminUser(supabase, user.id))) redirect("/dashboard");

  // Waitlist RLS is service-role-only (admin gate enforced above).
  const svc = createServiceRoleClient();
  const { data: signups, error } = await svc
    .from("waitlist")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch waitlist:", error.message);
  }

  return (
    <div>
      <PageHeader
        title="Waitlist"
        titleClassName="text-4xl font-bold text-grid-iq"
        subtitle={`${signups?.length ?? 0} signups`}
      />
      <WaitlistTable signups={signups ?? []} />
    </div>
  );
}
