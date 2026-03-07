import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { MlaUploader } from "./mla-uploader";
import { isAdminEmail } from "@/lib/data/admin";

export const metadata = { title: "MLA CSV Upload - Admin" };

export default async function MlaUploadPage() {
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

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="MLA CSV Upload"
        subtitle="Upload MLA CSV files to populate saleyard-specific pricing data."
      />
      <MlaUploader userEmail={user.email ?? ""} />
    </div>
  );
}
