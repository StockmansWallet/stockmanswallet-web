import type { MetadataRoute } from "next";

const BASE_URL = "https://stockmanswallet.com.au";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/onboarding/",
          "/dashboard/",
          "/herds/",
          "/properties/",
          "/yardbook/",
          "/reports/",
          "/settings/",
          "/asset-register",
          "/lender-report",
          "/sales-summary",
          "/saleyard-comparison",
          "/accountant",
          "/value-vs-land-area",
          "/property-comparison",
          "/sign-in",
          "/sign-up",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
