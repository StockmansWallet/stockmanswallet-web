import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Explicit rate-limit rules. Each rule pins method + path pattern + limit,
 * so adding a new route under a matching prefix doesn't silently inherit
 * rate-limiting behaviour. Matching is exact-prefix for simple cases;
 * method must also match.
 *
 * NOTE: this is backed by an in-memory Map that is per-Vercel-instance,
 * which means a caller can rotate through lambdas to bypass. For
 * production-grade rate limiting this needs to move to Upstash / Vercel KV
 * (tracked as a separate backlog item from the 2026-04-18 audit).
 */
const RATE_LIMIT_RULES: Array<{
  pathPrefix: string;
  methods: ReadonlyArray<string>;
  limit: number;
  windowMs: number;
}> = [
  { pathPrefix: "/sign-in",         methods: ["POST"],       limit: 10, windowMs: 60_000 },
  { pathPrefix: "/sign-up",         methods: ["POST"],       limit: 10, windowMs: 60_000 },
  { pathPrefix: "/forgot-password", methods: ["POST"],       limit: 10, windowMs: 60_000 },
  { pathPrefix: "/api/signup",      methods: ["POST"],       limit: 5,  windowMs: 60_000 },
];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  const rule = RATE_LIMIT_RULES.find(
    (r) => pathname.startsWith(r.pathPrefix) && r.methods.includes(method),
  );

  if (rule) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const key = `${ip}:${pathname}:${method}`;
    const { limited, resetAt } = rateLimit(key, rule.limit, rule.windowMs);

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
