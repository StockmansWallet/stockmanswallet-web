import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");

  if (code) {
    // Build a temporary response to hold cookies during code exchange
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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Detect recovery session: check the type param or the session's AMR
      // Supabase sets amr claim with method "recovery" for password reset flows
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const amr = (data.session?.user as any)?.amr as { method: string }[] | undefined;
      const isRecovery =
        type === "recovery" ||
        amr?.some((a) => a.method === "recovery") === true;

      const redirectTo = isRecovery ? "/reset-password" : "/dashboard";
      const response = NextResponse.redirect(`${origin}${redirectTo}`);

      // Copy cookies from the temp response to the redirect response
      for (const cookie of tempResponse.cookies.getAll()) {
        response.cookies.set(cookie.name, cookie.value);
      }

      return response;
    }
  }

  return NextResponse.redirect(`${origin}/sign-in`);
}
