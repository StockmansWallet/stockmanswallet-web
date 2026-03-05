"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
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

export async function signInWithApple() {
  const origin = (await headers()).get("origin");

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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
