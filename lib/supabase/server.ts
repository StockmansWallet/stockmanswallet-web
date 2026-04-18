import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * In production, force Supabase session cookies to be Secure + SameSite=Lax
 * even if the SDK default would drop Secure (e.g. during a preview deploy
 * behind an HTTP edge). Dev still gets the SDK defaults so localhost works.
 */
function hardenCookieOptions(
  options: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (process.env.NODE_ENV !== "production") return options ?? {};
  return {
    ...(options ?? {}),
    secure: true,
    sameSite: (options?.sameSite as string) ?? "lax",
  };
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, hardenCookieOptions(options)),
            );
          } catch {
            // setAll called from a Server Component.
            // Can be ignored if middleware is refreshing sessions.
          }
        },
      },
    },
  );
}
