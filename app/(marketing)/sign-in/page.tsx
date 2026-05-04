import type { Metadata } from "next";
import LandingContent from "@/components/marketing/landing-content";

export const metadata: Metadata = {
  title: "Sign in | Stockman's Wallet",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return <LandingContent />;
}
