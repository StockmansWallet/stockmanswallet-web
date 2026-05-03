"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Minimal subset of the Google Identity Services API surface we use.
// The script at https://accounts.google.com/gsi/client populates window.google.
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            nonce?: string;
            use_fedcm_for_prompt?: boolean;
            ux_mode?: "popup" | "redirect";
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>
          ) => void;
        };
      };
    };
  }
}

interface Props {
  onError: (message: string) => void;
  /** Maps to GIS `text` option. Defaults to "continue_with". */
  text?: "continue_with" | "signin_with" | "signup_with" | "signin";
}

export default function GoogleSignInButton({ onError, text = "continue_with" }: Props) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const router = useRouter();

  const handleCredential = useCallback(
    async (credential: string, rawNonce: string) => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: credential,
        nonce: rawNonce,
      });

      if (error) {
        onError(error.message || "Could not complete Google sign-in.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    },
    [onError, router]
  );

  useEffect(() => {
    if (!scriptReady || !buttonRef.current || !window.google) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      onError("Google sign-in is not configured for this environment.");
      return;
    }

    // Generate raw nonce; pass SHA-256 hash to Google so it gets bound into
    // the issued ID token, then verify the raw nonce on the Supabase exchange.
    const rawNonce = crypto.randomUUID() + crypto.randomUUID();

    let cancelled = false;

    (async () => {
      const enc = new TextEncoder();
      const buf = await crypto.subtle.digest("SHA-256", enc.encode(rawNonce));
      const hashedNonce = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (cancelled || !window.google || !buttonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        nonce: hashedNonce,
        use_fedcm_for_prompt: true,
        callback: ({ credential }) => {
          void handleCredential(credential, rawNonce);
        },
      });

      // GIS button is a fixed-width iframe; 352px matches the sibling
      // Apple/email buttons (lg:w-[22rem] = 352px) so all three pills line
      // up exactly. `outline` theme = white pill with grey border + colourful
      // G logo, pairs visually with the white Apple pill against the dark
      // SectionCard background.
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "pill",
        text,
        logo_alignment: "center",
        width: 352,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [scriptReady, handleCredential, onError, text]);

  // Outer h-10 matches the sibling Apple/email pills (also h-10) and the GIS
  // "large" button height (40px). All three buttons render at the same
  // pixel height, no vertical gap.
  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div
        ref={buttonRef}
        className="flex h-10 w-full max-w-[22rem] items-center justify-center overflow-hidden rounded-full bg-white [&_iframe]:rounded-full"
      />
    </>
  );
}
