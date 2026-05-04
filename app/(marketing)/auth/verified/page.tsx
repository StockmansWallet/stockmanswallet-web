import type { Metadata } from "next";
import LandingContent from "@/components/marketing/landing-content";

export const metadata: Metadata = {
  title: "Email verified | Stockman's Wallet",
  robots: { index: false, follow: false },
};

export default function VerifiedPage() {
  return <LandingContent />;
}
