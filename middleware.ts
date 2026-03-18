import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { rateLimit } from "@/lib/rate-limit";

// Debug: Paths that should be rate limited (auth and public API endpoints)
const RATE_LIMITED_PATHS = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/api/signup",
];

export async function middleware(request: NextRequest) {
  // Debug: Apply rate limiting to auth and public API endpoints
  const pathname = request.nextUrl.pathname;
  const isRateLimited = RATE_LIMITED_PATHS.some((p) => pathname.startsWith(p));

  if (isRateLimited && (request.method === "POST" || pathname.startsWith("/api/"))) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const key = `${ip}:${pathname}`;
    // Debug: 10 requests per minute for auth endpoints, 5 for signup API
    const limit = pathname.startsWith("/api/") ? 5 : 10;
    const { limited, remaining, resetAt } = rateLimit(key, limit, 60_000);

    if (limited) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    // Match all routes except static files and images
    "/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
