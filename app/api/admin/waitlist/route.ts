import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { isAdminUser } from "@/lib/data/admin";

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isAdminUser(supabase, user.id))) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids) ? body!.ids : [];
  const validIds = ids.filter((id): id is string => typeof id === "string" && id.length > 0);

  if (validIds.length === 0) {
    return NextResponse.json({ error: "No valid IDs provided" }, { status: 400 });
  }

  // Waitlist RLS is service-role-only; admin gate enforced above.
  const svc = createServiceRoleClient();
  const { error } = await svc.from("waitlist").delete().in("id", validIds);

  if (error) {
    console.error("Waitlist delete error:", error.message);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }

  return NextResponse.json({ success: true, deleted: validIds.length });
}
