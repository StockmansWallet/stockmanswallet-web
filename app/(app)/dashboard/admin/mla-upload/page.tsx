import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { MlaUploader } from "./mla-uploader";

// Admin email whitelist - must match mla-scraper Edge Function
const ADMIN_EMAILS = [
  "leon@stockmanswallet.com.au",
  "mil@stockmanswallet.com.au",
  "luke@stockmanswallet.com.au",
];

export const metadata = { title: "MLA CSV Upload - Admin" };

export default async function MlaUploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Admin gate - redirect non-admins to dashboard
  if (!ADMIN_EMAILS.includes(user.email ?? "")) {
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
