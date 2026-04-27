import Image from "next/image";

type PageBackgroundVariant = "photo" | "app";

// Matches iOS OnboardingSignInPage.signInBackground: deep base + landing photo +
// warm vertical gradient (lighter at top, darker at bottom) so the sky stays
// present and the lower half supports foreground text and cards.
export default function PageBackground({ variant = "photo" }: { variant?: PageBackgroundVariant }) {
  const isApp = variant === "app";

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-[#1C1B1B]" />
      <Image
        src="/images/landing-bg.webp"
        alt=""
        fill
        priority
        className={`object-cover ${isApp ? "scale-[1.035] opacity-70 blur-sm saturate-[0.78]" : ""}`}
      />
      <div
        className="absolute inset-0"
        style={{
          background: isApp
            ? "linear-gradient(to bottom, rgba(17,15,13,0.68) 0%, rgba(17,15,13,0.76) 34%, rgba(17,15,13,0.86) 68%, rgba(17,15,13,0.94) 100%)"
            : "linear-gradient(to bottom, rgba(15,15,15,0.32) 0%, rgba(15,15,15,0.46) 24%, rgba(15,15,15,0.60) 52%, rgba(15,15,15,0.80) 80%, rgba(15,15,15,0.94) 100%)",
        }}
      />
      {isApp && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(231,136,34,0.08),transparent_34%),linear-gradient(to_right,rgba(20,17,15,0.74),rgba(20,17,15,0.36)_28%,rgba(20,17,15,0.36)_72%,rgba(20,17,15,0.74))]" />
      )}
    </div>
  );
}

export type { PageBackgroundVariant };
