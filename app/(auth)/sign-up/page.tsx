"use client";

import { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Mail } from "lucide-react";
import logoAnimData from "@/public/animations/StockmansLogoAnim.json";
import { signUp, resendConfirmation, signInWithApple, signInWithGoogle } from "../actions";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });
const panelSpring = { type: "spring", stiffness: 320, damping: 30, mass: 0.85 } as const;

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpScreen />
    </Suspense>
  );
}

function SignUpScreen() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const queryError = searchParams.get("error");
  const displayError = error ?? queryError;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!email || !password || !confirmPassword) {
      setError("Fill in all fields to continue.");
      return;
    }

    if (password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const result = await signUp(formData);

    if (result && "error" in result && result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result && "confirmationRequired" in result && result.email) {
      setConfirmationEmail(result.email);
    }
    setLoading(false);
  }

  async function handleResend() {
    if (!confirmationEmail || resending) return;
    setResending(true);
    const result = await resendConfirmation(confirmationEmail);
    if (!result || !("error" in result)) {
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 4000);
    }
    setResending(false);
  }

  if (confirmationEmail) {
    return (
      <main className="fixed inset-0 z-10 overflow-y-auto">
        <div className="mx-auto flex min-h-screen w-full max-w-[34rem] items-center justify-center px-5 py-10 sm:px-6 sm:py-14">
          <div className="w-full space-y-6 text-center sm:space-y-7">
            <div className="mx-auto w-full max-w-[16rem]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/brangus-post.webp"
                alt="Brangus posting your verification"
                className="h-auto w-full object-contain drop-shadow-[0_8px_30px_rgba(0,0,0,0.28)]"
              />
            </div>

            <div className="px-2">
              <h1 className="text-[clamp(2rem,6vw,3rem)] font-semibold tracking-tight text-white">
                You&apos;re almost there, mate.
              </h1>
              <p className="mt-3 text-[clamp(1rem,3.2vw,1.28rem)] leading-relaxed text-white/72">
                Tap the link I&apos;ve sent to{" "}
                <span className="text-brand font-medium">{confirmationEmail}</span> to finish
                setting up your yard.
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[#4a4d40]/72 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:p-5">
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || resendSuccess}
                  className="flex min-h-16 w-full items-center justify-center gap-3 rounded-[1.55rem] border border-white/14 bg-black/14 px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-black/22 active:scale-[0.99] disabled:opacity-60"
                >
                  {resending
                    ? "Sending..."
                    : resendSuccess
                      ? "Verification email sent"
                      : "Resend verification email"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setConfirmationEmail(null);
                    setError(null);
                  }}
                  className="inline-flex w-full items-center justify-center gap-1.5 px-5 py-3 text-sm font-medium text-white/68 transition-colors hover:text-white"
                >
                  Use a different email
                </button>
              </div>
            </div>

            <p className="text-sm text-white/60">
              Already verified?{" "}
              <Link
                href="/sign-in"
                className="hover:text-brand-light font-medium text-white transition-colors"
              >
                Sign in
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
              Welcome to the yard.
            </h1>
            <p className="mt-3 text-[clamp(1rem,3.2vw,1.28rem)] leading-relaxed text-white/72">
              Set up your account and start tracking your herds.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[#4a4d40]/72 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:p-5">
            <div className="space-y-3">
              <form action={signInWithApple}>
                <button
                  type="submit"
                  className="flex min-h-16 w-full items-center justify-center gap-3 rounded-[1.55rem] bg-white px-5 py-4 text-base font-semibold text-black shadow-[0_10px_30px_rgba(255,255,255,0.18)] transition-colors hover:bg-white/95 active:scale-[0.99]"
                >
                  <svg className="h-6 w-6" viewBox="0 0 17 20" fill="currentColor" aria-hidden>
                    <path d="M13.545 10.239c-.022-2.234 1.823-3.306 1.906-3.358-.037-.054-1.494-1.403-2.856-1.403-1.216 0-2.478.727-3.09.727-.646 0-1.616-.708-2.664-.69-1.37.02-2.634.798-3.34 2.026-1.424 2.468-.364 6.124 1.022 8.127.678.98 1.485 2.08 2.547 2.04 1.022-.041 1.408-.661 2.643-.661 1.216 0 1.562.661 2.623.64 1.1-.018 1.795-1 2.468-1.983.778-1.135 1.098-2.234 1.118-2.291-.025-.011-2.145-.824-2.168-3.269l-.209.095zm-2.034-6.008c.563-.683.943-1.631.84-2.576-.811.033-1.795.541-2.376 1.222-.522.603-.979 1.567-.855 2.492.905.07 1.829-.461 2.391-1.138z" />
                  </svg>
                  Sign up with Apple
                </button>
              </form>

              <form action={signInWithGoogle}>
                <button
                  type="submit"
                  className="flex min-h-16 w-full items-center justify-center gap-3 rounded-[1.55rem] border border-white/16 bg-black/18 px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-black/24 active:scale-[0.99]"
                >
                  <svg className="h-6 w-6" viewBox="0 0 24 24" aria-hidden>
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Sign up with Google
                </button>
              </form>

              <AnimatePresence initial={false}>
                {displayError && (
                  <motion.div
                    key="sign-up-error"
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
                      {displayError}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} noValidate>
                <AnimatePresence initial={false}>
                  {showEmailForm && (
                    <motion.div
                      key="email-fields"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={panelSpring}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="space-y-3 pb-3">
                        <div className="space-y-2 text-left">
                          <label
                            htmlFor="email"
                            className="block text-sm font-medium text-white/78"
                          >
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

                        <div className="space-y-2 text-left">
                          <label
                            htmlFor="password"
                            className="block text-sm font-medium text-white/78"
                          >
                            Password
                          </label>
                          <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            placeholder="At least 12 characters"
                            className="focus:border-brand/70 focus:ring-brand/20 w-full rounded-2xl border border-white/10 bg-white/12 px-4 py-3.5 text-base text-white transition-colors outline-none placeholder:text-white/40 focus:bg-white/15 focus:ring-2"
                          />
                        </div>

                        <div className="space-y-2 text-left">
                          <label
                            htmlFor="confirmPassword"
                            className="block text-sm font-medium text-white/78"
                          >
                            Confirm password
                          </label>
                          <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            placeholder="Re-enter your password"
                            className="focus:border-brand/70 focus:ring-brand/20 w-full rounded-2xl border border-white/10 bg-white/12 px-4 py-3.5 text-base text-white transition-colors outline-none placeholder:text-white/40 focus:bg-white/15 focus:ring-2"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type={showEmailForm ? "submit" : "button"}
                  onClick={() => {
                    if (!showEmailForm) {
                      setError(null);
                      setShowEmailForm(true);
                    }
                  }}
                  disabled={loading}
                  className="flex min-h-16 w-full items-center justify-center gap-3 rounded-[1.55rem] border border-white/14 bg-black/14 px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-black/22 active:scale-[0.99] disabled:opacity-60"
                >
                  <Mail className="h-5 w-5" />
                  {loading
                    ? "Creating account..."
                    : showEmailForm
                      ? "Create account"
                      : "Sign up with email"}
                </button>

                <AnimatePresence initial={false}>
                  {showEmailForm && (
                    <motion.div
                      key="email-actions"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={panelSpring}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="flex items-center justify-between gap-3 pt-3 text-sm">
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            setShowEmailForm(false);
                          }}
                          className="inline-flex items-center gap-1.5 text-white/68 transition-colors hover:text-white"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Back
                        </button>

                        <span className="text-white/50">At least 12 characters</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </div>
          </div>

          <p className="text-sm text-white/60">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="hover:text-brand-light font-medium text-white transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
