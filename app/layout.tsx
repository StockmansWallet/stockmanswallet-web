import type { Metadata } from "next";
import { Caveat, Geist_Mono, Nunito } from "next/font/google";
import { PaletteToggle } from "@/components/dev/palette-toggle";
import "./globals.css";

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
  title: {
    default: "Stockman's Wallet - Intelligent Livestock Valuation",
    template: "Stockman's Wallet | %s",
  },
  description:
    "Track your cattle, sheep and pig herds as financial assets with real-time MLA market valuations. Built for Australian producers.",
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
  authors: [{ name: "Stockman's Wallet" }],
  openGraph: {
    title: "Stockman's Wallet - Intelligent Livestock Valuation",
    description: "Track your livestock herds as financial assets with real-time market valuations.",
    url: "https://stockmanswallet.com.au",
    siteName: "Stockman's Wallet",
    locale: "en_AU",
    type: "website",
  },
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
        <PaletteToggle />
      </body>
    </html>
  );
}
