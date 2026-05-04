import Hero from "@/components/marketing/sections/hero";
import Features from "@/components/marketing/sections/features";
import Brangus from "@/components/marketing/sections/brangus";
import { ADVISOR_ENABLED } from "@/lib/feature-flags";
import ForAdvisors from "@/components/marketing/sections/for-advisors";
import Pricing from "@/components/marketing/sections/pricing";
import About from "@/components/marketing/sections/about";
import ContactSignup from "@/components/marketing/sections/contact-signup";

export default function LandingContent() {
  return (
    <div className="space-y-8 pb-8">
      <Hero />
      <Features />
      <Brangus />
      {ADVISOR_ENABLED && <ForAdvisors />}
      <Pricing />
      <About />
      <ContactSignup />
    </div>
  );
}
