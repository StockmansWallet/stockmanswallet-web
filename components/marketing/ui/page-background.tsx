import Image from "next/image";

// Matches iOS OnboardingSignInPage.signInBackground: deep base + landing photo +
// warm vertical gradient (lighter at top, darker at bottom) so the sky stays
// present and the lower half supports foreground text and cards.
export default function PageBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-[#1C1B1B]" />
      <Image src="/images/landing-bg.webp" alt="" fill priority className="object-cover" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(15,15,15,0.32) 0%, rgba(15,15,15,0.46) 24%, rgba(15,15,15,0.60) 52%, rgba(15,15,15,0.80) 80%, rgba(15,15,15,0.94) 100%)",
        }}
      />
    </div>
  );
}
