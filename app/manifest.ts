import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Stockman's Wallet",
    short_name: "Stockman's Wallet",
    description:
      "Australia's first livestock portfolio management platform. Live market data, intelligent valuation, and AI-powered timing analysis for producers.",
    start_url: "/",
    display: "standalone",
    background_color: "#14110f",
    theme_color: "#14110f",
    orientation: "portrait",
    lang: "en-AU",
    icons: [
      {
        src: "/images/app-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/app-icon-1024.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
