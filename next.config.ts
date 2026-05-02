import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Include @sparticuz/chromium binary files in the PDF generation serverless
  // function. Without this, Vercel's output file tracing excludes the bin/
  // directory and Puppeteer fails at runtime with 'executable not found'.
  outputFileTracingIncludes: {
    "/api/reports/generate": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
  images: {
    // Allow high-quality optimisations on marketing imagery. Next.js 16
    // restricts quality values to those listed here; without it, requests
    // for q=90/95 return HTTP 400 and the browser falls back to its cache.
    qualities: [75, 90, 95],
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
            // `same-origin-allow-popups` isolates against same-origin popups
            // opened by other origins (XS-Leaks, tab-napping) while still
            // allowing popups WE opened (e.g. Google Identity Services
            // sign-in popup at accounts.google.com) to post the OAuth
            // credential back to us via `window.opener.postMessage`. Strict
            // `same-origin` would silently break the GIS popup flow - the
            // popup completes auth then can't return the credential.
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
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
              // Note: 'unsafe-inline' on scripts is required by Next.js
              // hydration. Migrate to a nonce-based policy via middleware
              // post-launch.
              // accounts.google.com hosts the Google Identity Services
              // (gsi/client) script used for the native ID-token sign-in flow.
              "script-src 'self' 'unsafe-inline' https://accounts.google.com https://maps.googleapis.com https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline' https://accounts.google.com https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://*.supabase.co https://maps.googleapis.com https://maps.gstatic.com https://lh3.googleusercontent.com https://*.googleusercontent.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https://accounts.google.com https://*.supabase.co wss://*.supabase.co https://api.supabase.com https://maps.googleapis.com https://api.open-meteo.com https://va.vercel-scripts.com https://vitals.vercel-insights.com",
              // GIS renders the sign-in button and FedCM dialog as iframes
              // hosted on accounts.google.com.
              "frame-src https://accounts.google.com",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
