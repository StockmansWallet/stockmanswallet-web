"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const updatePasswordSchema = z.object({
  password: z.string().min(8),
});

export async function signIn(formData: FormData) {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Invalid email or password" };
  }

  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://stockmanswallet.com.au";

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If no session returned, email confirmation is required
  if (!data.session) {
    return { confirmationRequired: true as const, email: parsed.data.email };
  }

  redirect("/dashboard");
}

export async function forgotPassword(formData: FormData) {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://stockmanswallet.com.au";

  // Always return success to avoid revealing whether the email exists
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
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
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
  });

  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function resendConfirmation(email: string) {
  const parsed = forgotPasswordSchema.safeParse({ email });
  if (!parsed.success) return { error: "Invalid email" };

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://stockmanswallet.com.au";

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) return { error: "Could not resend confirmation email. Please try again." };
  return { success: true };
}

export async function signInWithApple() {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://stockmanswallet.com.au";

  // Generate nonce  -  Apple will embed the hash in the ID token,
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
    client_id: process.env.APPLE_CLIENT_ID || "com.leonernst.StockmansWallet.web",
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
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://stockmanswallet.com.au";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        prompt: "select_account",
      },
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
