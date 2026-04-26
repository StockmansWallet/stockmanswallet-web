import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Include @sparticuz/chromium binary files in the PDF generation serverless
  // function. Without this, Vercel's output file tracing excludes the bin/
  // directory and Puppeteer fails at runtime with 'executable not found'.
  outputFileTracingIncludes: {
    "/api/reports/generate": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
  images: {
    // Pin to the exact Supabase project subdomain. The previous wildcard
    // (*.supabase.co) would let next/image optimise and proxy images from
    // any Supabase project - an attacker controlling any public Supabase
    // project could serve tracking beacons or malicious SVGs via our origin.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "glxnmljnuzigyqydsxhc.supabase.co",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            // Isolates this origin from same-origin popups opened by other
            // origins. Prevents XS-Leaks and tab-napping against Supabase
            // auth flows.
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            // Blocks other origins from embedding our responses as no-cors
            // subresources. Stops a malicious page from fetching our assets
            // and using Spectre-style side channels to read them.
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "media-src 'self' blob:",
              "script-src 'self' 'unsafe-inline' https://maps.googleapis.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://*.supabase.co https://maps.googleapis.com https://maps.gstatic.com https://lh3.googleusercontent.com https://*.googleusercontent.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.supabase.com https://maps.googleapis.com https://api.open-meteo.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
