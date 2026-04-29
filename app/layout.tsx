import type { Metadata, Viewport } from "next";
import { Caveat, Geist_Mono, Nunito } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { StructuredData } from "@/components/marketing/structured-data";
import "./globals.css";

const SITE_URL = "https://stockmanswallet.com.au";
const SITE_NAME = "Stockman's Wallet";
const SITE_DESCRIPTION =
  "Track your cattle, sheep and pig herds as financial assets with real-time MLA market valuations. Built for Australian producers.";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} - Intelligent Livestock Valuation`,
    template: `${SITE_NAME} | %s`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "livestock",
    "cattle",
    "valuation",
    "farming",
    "portfolio",
    "MLA",
    "market data",
    "Australia",
    "grazier",
    "herd management",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${SITE_NAME} - Intelligent Livestock Valuation`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "en_AU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} - Intelligent Livestock Valuation`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#14110f",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-AU" className="dark">
      <body
        className={`${geistMono.variable} ${nunito.variable} ${caveat.variable} font-sans antialiased`}
      >
        {children}
        <Analytics />
        <StructuredData />
      </body>
    </html>
  );
}
