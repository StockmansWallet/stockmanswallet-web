import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in`);
  }

  // Detect recovery flow via cookie set by forgotPassword action
  const isRecovery =
    request.cookies.get("sw-password-recovery")?.value === "true";
  const redirectTo = isRecovery ? "/reset-password" : "/dashboard";
  const response = NextResponse.redirect(`${origin}${redirectTo}`);

  // Create Supabase client that writes cookies directly onto the redirect response
  // This preserves all cookie options (httpOnly, secure, sameSite, path, maxAge)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
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
