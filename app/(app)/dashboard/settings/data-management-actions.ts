"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Clears ALL user data (herds, records, properties, etc.) from the cloud via Edge Function.
// Account remains active. Affects both web app and iOS app (shared Supabase backend).
export async function clearAllUserData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Get the user's JWT to authenticate with the Edge Function
  const { data: sessionData } = await supabase.auth.getSession();
  const jwt = sessionData.session?.access_token;
  if (!jwt) return { error: "No active session" };

  // Call the clear-user-data Edge Function
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/clear-user-data`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { error: body.error || `Server error (${response.status})` };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/herds");
  revalidatePath("/dashboard/properties");
  revalidatePath("/dashboard/tools/yard-book");
  return { success: true };
}
