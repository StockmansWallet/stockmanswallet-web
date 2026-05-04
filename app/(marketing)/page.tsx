import type { Metadata } from "next";
import LandingContent from "@/components/marketing/landing-content";

export const metadata: Metadata = {
  title: {
    absolute: "Stockman's Wallet | Intelligent Livestock Valuation",
  },
  description:
    "Australia's first livestock portfolio management platform. Live market data, intelligent valuation models, AI-powered timing analysis, and professional-grade reporting for Australian producers.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Stockman's Wallet | Intelligent Livestock Valuation",
    description:
      "Australia's first livestock portfolio management platform. Live market data, intelligent valuation models, and professional-grade reporting.",
    url: "https://stockmanswallet.com.au",
    siteName: "Stockman's Wallet",
    locale: "en_AU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stockman's Wallet | Intelligent Livestock Valuation",
    description:
      "Australia's first livestock portfolio management platform. Live market data, intelligent valuation models, and professional-grade reporting.",
  },
};

export default function HomePage() {
  return <LandingContent />;
}
