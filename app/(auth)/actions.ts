"use server";

import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    return { error: error.message };
  }

  // mailer_autoconfirm is enabled - account is confirmed immediately
  redirect("/dashboard");
}

export async function forgotPassword(formData: FormData) {
  const supabase = await createClient();
  const origin = (await headers()).get("origin") || "https://stockmanswallet.com.au";
  const email = formData.get("email") as string;

  // Always return success to avoid revealing whether the email exists
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback`,
  });

  // Set a cookie so the callback route knows this is a recovery flow
  // Supabase PKCE doesn't reliably forward query params or expose AMR after code exchange
  const cookieStore = await cookies();
  cookieStore.set("sw-password-recovery", "true", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 3600, // 1 hour - matches Supabase OTP expiry
    path: "/",
  });

  return { success: true };
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function signInWithApple() {
  const origin = (await headers()).get("origin") || "https://stockmanswallet.com.au";

  // Generate nonce — Apple will embed the hash in the ID token,
  // and we carry the raw value back via the state parameter.
  const rawNonce = crypto.randomUUID();
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(rawNonce)
  );
  const hashedNonce = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const params = new URLSearchParams({
    client_id: "com.leonernst.StockmansWallet.web",
    redirect_uri: `${origin}/auth/apple-callback`,
    response_type: "code id_token",
    response_mode: "form_post",
    scope: "name email",
    nonce: hashedNonce,
    state: rawNonce,
  });

  redirect(`https://appleid.apple.com/auth/authorize?${params.toString()}`);
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const origin = (await headers()).get("origin") || "https://stockmanswallet.com.au";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error || !data.url) {
    redirect("/sign-in?error=Could+not+start+Google+sign+in");
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
