import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { WaitlistProvider } from "@/components/marketing/ui/waitlist-provider";
import { SignInProvider } from "@/components/marketing/ui/sign-in-provider";
import { SignUpProvider } from "@/components/marketing/ui/sign-up-provider";
import { VerifiedProvider } from "@/components/marketing/ui/verified-provider";
import PageBackground from "@/components/marketing/ui/page-background";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <WaitlistProvider>
      <SignInProvider>
        <SignUpProvider>
          <VerifiedProvider>
            <div className="flex min-h-screen flex-col">
              <PageBackground />
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </VerifiedProvider>
        </SignUpProvider>
      </SignInProvider>
    </WaitlistProvider>
  );
}
