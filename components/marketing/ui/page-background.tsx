import Image from "next/image";

type PageBackgroundVariant = "photo" | "app";

// Matches iOS OnboardingSignInPage.signInBackground: deep base + landing photo +
// warm vertical gradient (lighter at top, darker at bottom) so the sky stays
// present and the lower half supports foreground text and cards.
export default function PageBackground({ variant = "photo" }: { variant?: PageBackgroundVariant }) {
  const isApp = variant === "app";

  if (isApp) {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#17130f]"
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#17130f_0%,#1b1812_40%,#18130f_72%,#120f0d_100%)]" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 2050px 1320px at -14% -20%, color-mix(in srgb, var(--color-brand) 32%, transparent), color-mix(in srgb, var(--color-brand) 13%, transparent) 38%, color-mix(in srgb, var(--color-brand) 3.5%, transparent) 64%, transparent 84%), radial-gradient(ellipse 1700px 980px at 58% 46%, color-mix(in srgb, var(--color-ch40) 7%, transparent), color-mix(in srgb, var(--color-ch40) 2.6%, transparent) 48%, transparent 78%)",
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(73,49,32,0.18)_80%,rgba(35,24,18,0.38)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_1150px_760px_at_50%_38%,transparent_0%,rgba(8,7,6,0.08)_58%,rgba(8,7,6,0.36)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,7,6,0.24)_0%,transparent_18%,transparent_82%,rgba(8,7,6,0.26)_100%)]" />
      </div>
    );
  }

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-[#1C1B1B]" />
      <Image
        src="/images/landing-bg.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className={`object-cover ${isApp ? "scale-[1.035] opacity-70 blur-sm saturate-[0.78]" : ""}`}
      />
      <div
        className="absolute inset-0"
        style={{
          background: isApp
            ? "linear-gradient(to bottom, rgba(17,15,13,0.68) 0%, rgba(17,15,13,0.76) 34%, rgba(17,15,13,0.86) 68%, rgba(17,15,13,0.94) 100%)"
            : "linear-gradient(to bottom, rgba(15,15,15,0.18) 0%, rgba(15,15,15,0.28) 28%, rgba(15,15,15,0.50) 58%, rgba(15,15,15,0.68) 82%, rgba(15,15,15,0.78) 100%)",
        }}
      />
      {isApp && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(231,136,34,0.08),transparent_34%),linear-gradient(to_right,rgba(20,17,15,0.74),rgba(20,17,15,0.36)_28%,rgba(20,17,15,0.36)_72%,rgba(20,17,15,0.74))]" />
      )}
    </div>
  );
}

export type { PageBackgroundVariant };
