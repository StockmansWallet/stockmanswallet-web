import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next");
  const safeNext =
    requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : null;

  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in`);
  }

  // Detect recovery flow via explicit callback params, with the cookie kept as
  // a fallback for older links/providers that do not preserve query params.
  const isRecovery =
    searchParams.get("type") === "recovery" ||
    safeNext === "/reset-password" ||
    request.cookies.get("sw-password-recovery")?.value === "true";
  // Detect iOS email verification (custom URL schemes don't work in email clients)
  const isIOS = searchParams.get("source") === "ios";
  const redirectTo = isRecovery
    ? "/reset-password"
    : isIOS
      ? "/auth/verified"
      : safeNext ?? "/dashboard";
  const response = NextResponse.redirect(`${origin}${redirectTo}`);

  // Create Supabase client that writes cookies directly onto the redirect response
  // This preserves all cookie options (httpOnly, secure, sameSite, path, maxAge).
  // In production we force Secure + SameSite=Lax so the session cookie survives
  // the cross-site OAuth round-trip (Supabase -> our callback -> /dashboard).
  // Without this, browsers can drop the cookie and middleware sees no session,
  // looping the user back to /sign-in even though the code exchange succeeded.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const hardened =
              process.env.NODE_ENV === "production"
                ? { ...options, secure: true, sameSite: options?.sameSite ?? "lax" }
                : options;
            response.cookies.set(name, value, hardened);
          });
        },
      },
    }
  );

  const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/sign-in`);
  }

  // Fetch Google avatar via provider token if not already in user metadata
  if (
    sessionData?.session?.provider_token &&
    !sessionData.session.user.user_metadata?.avatar_url
  ) {
    try {
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${sessionData.session.provider_token}` },
      });
      if (res.ok) {
        const userInfo = await res.json();
        if (userInfo.picture) {
          await supabase.auth.updateUser({
            data: { avatar_url: userInfo.picture },
          });
        }
      }
    } catch {
      // Non-critical - continue without avatar
    }
  }

  // Clear the recovery cookie after use
  if (isRecovery) {
    response.cookies.set("sw-password-recovery", "", {
      maxAge: 0,
      path: "/",
    });
  }

  return response;
}
