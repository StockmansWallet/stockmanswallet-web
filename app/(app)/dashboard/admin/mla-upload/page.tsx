import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { MlaUploader } from "./mla-uploader";
import { isAdminUser } from "@/lib/data/admin";

export const metadata = { title: "MLA CSV Upload - Admin" };

export default async function MlaUploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (!(await isAdminUser(supabase, user.id))) {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="MLA CSV Upload"
        titleClassName="text-4xl font-bold text-success"
        subtitle="Upload MLA CSV files to populate saleyard-specific pricing data."
      />
      <MlaUploader userEmail={user.email ?? ""} />
    </div>
  );
}
