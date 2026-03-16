import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const tempResponse = NextResponse.next();

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
              tempResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Detect recovery: cookie set by forgotPassword action, or type param as fallback
      const isRecovery =
        request.cookies.get("sw-password-recovery")?.value === "true" ||
        searchParams.get("type") === "recovery";

      const redirectTo = isRecovery ? "/reset-password" : "/dashboard";
      const response = NextResponse.redirect(`${origin}${redirectTo}`);

      // Copy auth cookies from the code exchange
      for (const cookie of tempResponse.cookies.getAll()) {
        response.cookies.set(cookie.name, cookie.value);
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
  }

  return NextResponse.redirect(`${origin}/sign-in`);
}
