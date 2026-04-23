"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import logoAnimData from "@/public/animations/StockmansLogoAnim.json";
import { forgotPassword } from "../actions";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });
const panelSpring = { type: "spring", stiffness: 320, damping: 30, mass: 0.85 } as const;

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentEmail, setSentEmail] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    if (!email) {
      setError("Enter your email to continue.");
      return;
    }

    setLoading(true);
    await forgotPassword(formData);
    setSentEmail(email);
    setLoading(false);
  }

  if (sentEmail) {
    return (
      <main className="fixed inset-0 z-10 overflow-y-auto">
        <div className="mx-auto flex min-h-screen w-full max-w-[34rem] items-center justify-center px-5 py-10 sm:px-6 sm:py-14">
          <div className="w-full space-y-6 text-center sm:space-y-7">
            <div className="mx-auto w-full max-w-[16rem]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/brangus-post.webp"
                alt="Brangus posting your reset link"
                className="h-auto w-full object-contain drop-shadow-[0_8px_30px_rgba(0,0,0,0.28)]"
              />
            </div>

            <div className="px-2">
              <h1 className="text-[clamp(2rem,6vw,3rem)] font-semibold tracking-tight text-white">
                Check your email.
              </h1>
              <p className="mt-3 text-[clamp(1rem,3.2vw,1.28rem)] leading-relaxed text-white/72">
                If an account exists for <span className="text-brand font-medium">{sentEmail}</span>
                , I&apos;ve sent a reset link. Have a squiz at your inbox (and the spam folder).
              </p>
            </div>

            <p className="text-sm text-white/60">
              <Link
                href="/sign-in"
                className="hover:text-brand-light font-medium text-white transition-colors"
              >
                Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 z-10 overflow-y-auto">
      <div className="mx-auto flex min-h-screen w-full max-w-[34rem] items-center justify-center px-5 py-10 sm:px-6 sm:py-14">
        <div className="w-full space-y-6 text-center sm:space-y-7">
          <div className="mx-auto w-full max-w-[14rem] drop-shadow-[0_8px_30px_rgba(0,0,0,0.28)] sm:max-w-[16rem]">
            <Lottie animationData={logoAnimData} loop={false} className="h-auto w-full" />
          </div>

          <div className="px-2">
            <h1 className="text-[clamp(2rem,6vw,3rem)] font-semibold tracking-tight text-white">
              Forgot your password?
            </h1>
            <p className="mt-3 text-[clamp(1rem,3.2vw,1.28rem)] leading-relaxed text-white/72">
              Pop in your email and I&apos;ll send you a link to reset it.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[#4a4d40]/72 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:p-5">
            <form onSubmit={handleSubmit} noValidate className="space-y-3">
              <AnimatePresence initial={false}>
                {error && (
                  <motion.div
                    key="forgot-error"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={panelSpring}
                    style={{ overflow: "hidden" }}
                  >
                    <p
                      role="alert"
                      className="rounded-[1.1rem] border border-red-400/20 bg-red-950/30 px-4 py-3 text-sm text-red-100"
                    >
                      {error}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2 text-left">
                <label htmlFor="email" className="block text-sm font-medium text-white/78">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="focus:border-brand/70 focus:ring-brand/20 w-full rounded-2xl border border-white/10 bg-white/12 px-4 py-3.5 text-base text-white transition-colors outline-none placeholder:text-white/40 focus:bg-white/15 focus:ring-2"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-brand hover:bg-brand-dark flex min-h-16 w-full items-center justify-center rounded-[1.55rem] px-5 py-4 text-base font-semibold text-white transition-colors active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          </div>

          <p className="text-sm text-white/60">
            <Link
              href="/sign-in"
              className="hover:text-brand-light font-medium text-white transition-colors"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
