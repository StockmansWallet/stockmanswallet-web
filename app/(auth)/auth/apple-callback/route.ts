import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const idToken = formData.get("id_token") as string;
  const rawNonce = formData.get("state") as string; // raw nonce carried via state
  const origin = new URL(request.url).origin;

  if (!idToken || !rawNonce) {
    return NextResponse.redirect(`${origin}/sign-in`, 303);
  }

  // 303 See Other  -  switches from POST to GET for the redirect
  const response = NextResponse.redirect(`${origin}/dashboard`, 303);

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

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: idToken,
    nonce: rawNonce,
  });

  if (!error) {
    return response;
  }

  return NextResponse.redirect(`${origin}/sign-in`, 303);
}
