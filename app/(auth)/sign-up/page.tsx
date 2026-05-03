"use client";

import { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Mail } from "lucide-react";
import tallyAnimData from "@/public/animations/tally.json";
import SectionCard from "@/components/marketing/ui/section-card";
import { signUp, resendConfirmation, signInWithApple } from "../actions";
import GoogleSignInButton from "../google-sign-in-button";

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const queryError = searchParams.get("error");
  const displayError = error ?? queryError;
  const passwordsMismatch =
    password.length > 0 && confirmPassword.length > 0 && password !== confirmPassword;

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

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
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
        <div className="mx-auto flex min-h-screen w-full max-w-[34rem] items-center justify-center px-5 py-6 sm:px-6 sm:py-10 lg:max-w-[64rem] lg:px-8 lg:py-14">
          <SectionCard className="w-full" glowPosition="28% 28%">
            <div className="relative z-[2] flex w-full flex-col items-center gap-y-6 text-center sm:gap-y-7 lg:flex-row lg:items-stretch lg:justify-center lg:gap-x-16 lg:gap-y-0 lg:text-left">
            <div className="flex w-full max-w-[34rem] flex-col items-center gap-y-6 sm:gap-y-7 lg:max-w-[28rem] lg:flex-1 lg:items-center lg:justify-center lg:text-center">
              <div className="mx-auto w-full max-w-[14rem] sm:max-w-[16rem]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/brangus-post.webp"
                  alt="Brangus posting your verification"
                  className="h-auto w-full object-contain drop-shadow-[0_8px_30px_rgba(0,0,0,0.28)]"
                />
              </div>

              <div className="px-2 lg:max-w-[22rem] lg:px-0">
                <h1 className="text-[clamp(1.65rem,5vw,2.25rem)] font-semibold tracking-tight text-white lg:text-[2.35rem] lg:leading-[1.12]">
                  You&apos;re almost there, mate.
                </h1>
                <p className="mt-3 text-[clamp(0.95rem,2.5vw,1.08rem)] leading-relaxed text-white/72 lg:text-[1.02rem]">
                  Tap the link I&apos;ve sent to
                  <br />
                  <span className="text-brand font-medium">{confirmationEmail}</span>
                </p>
              </div>
            </div>

            <div className="flex w-full max-w-[22rem] flex-col gap-y-6 sm:gap-y-7 lg:w-[22rem] lg:max-w-[22rem] lg:flex-shrink-0 lg:justify-center lg:py-2">
              <div>
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending || resendSuccess}
                    className="flex h-10 w-full items-center justify-center gap-2.5 rounded-full border border-white/14 bg-black/14 px-4 text-sm font-medium text-white transition-colors hover:bg-black/22 active:scale-[0.99] disabled:opacity-60"
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

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-white/40">
                  <span aria-hidden className="h-px flex-1 bg-white/10" />
                  Already verified
                  <span aria-hidden className="h-px flex-1 bg-white/10" />
                </div>

                <Link
                  href="/sign-in"
                  className="border-brand/45 text-brand hover:border-brand/65 hover:bg-brand/10 hover:text-brand-light flex h-10 w-full items-center justify-center rounded-full border bg-transparent px-4 text-sm font-medium transition-colors active:scale-[0.99]"
                >
                  Sign in
                </Link>
              </div>
            </div>
            </div>
          </SectionCard>
        </div>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 z-10 overflow-y-auto">
      <div className="mx-auto flex min-h-screen w-full max-w-[34rem] items-center justify-center px-5 py-6 sm:px-6 sm:py-10 lg:max-w-[64rem] lg:px-8 lg:py-14">
        <SectionCard className="w-full" glowPosition="28% 28%">
          <div className="relative z-[2] flex w-full flex-col items-center gap-y-6 text-center sm:gap-y-7 lg:flex-row lg:items-stretch lg:justify-center lg:gap-x-16 lg:gap-y-0 lg:text-left">
          <div className="flex w-full max-w-[34rem] flex-col items-center gap-y-6 sm:gap-y-7 lg:max-w-[28rem] lg:flex-1 lg:items-center lg:justify-center lg:text-center">
            <div className="mx-auto w-full max-w-[6.5rem] drop-shadow-[0_8px_30px_rgba(231,136,34,0.2)] sm:max-w-[7.5rem]">
              <Lottie animationData={tallyAnimData} loop={false} className="h-auto w-full" />
            </div>

            <div className="px-2 lg:px-0">
              <h1 className="text-[clamp(1.65rem,5vw,2.25rem)] font-semibold tracking-tight text-white lg:text-[2.35rem] lg:leading-[1.12]">
                Welcome to the yard.
              </h1>
              <p className="mt-3 text-[clamp(0.95rem,2.5vw,1.08rem)] leading-relaxed text-white/72 lg:text-[1.02rem]">
                Add your herds, track the market, know where you stand.
              </p>
            </div>
          </div>

          <div className="flex w-full max-w-[22rem] flex-col gap-y-6 sm:gap-y-7 lg:w-[22rem] lg:max-w-[22rem] lg:flex-shrink-0 lg:justify-center lg:py-2">
            <div>
              <div className="space-y-2.5">
                <form action={signInWithApple}>
                  <button
                    type="submit"
                    className="flex h-10 w-full items-center justify-center gap-2.5 rounded-full bg-white px-4 text-sm font-medium text-black transition-colors hover:bg-white/95 active:scale-[0.99]"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 17 20" fill="currentColor" aria-hidden>
                      <path d="M13.545 10.239c-.022-2.234 1.823-3.306 1.906-3.358-.037-.054-1.494-1.403-2.856-1.403-1.216 0-2.478.727-3.09.727-.646 0-1.616-.708-2.664-.69-1.37.02-2.634.798-3.34 2.026-1.424 2.468-.364 6.124 1.022 8.127.678.98 1.485 2.08 2.547 2.04 1.022-.041 1.408-.661 2.643-.661 1.216 0 1.562.661 2.623.64 1.1-.018 1.795-1 2.468-1.983.778-1.135 1.098-2.234 1.118-2.291-.025-.011-2.145-.824-2.168-3.269l-.209.095zm-2.034-6.008c.563-.683.943-1.631.84-2.576-.811.033-1.795.541-2.376 1.222-.522.603-.979 1.567-.855 2.492.905.07 1.829-.461 2.391-1.138z" />
                    </svg>
                    Sign up with Apple
                  </button>
                </form>

                <GoogleSignInButton text="signup_with" onError={(msg) => setError(msg)} />

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
                          <div className="space-y-1.5 text-left">
                            <label
                              htmlFor="email"
                              className="block text-xs font-medium tracking-wide text-white/72"
                            >
                              Email
                            </label>
                            <input
                              id="email"
                              name="email"
                              type="email"
                              autoComplete="email"
                              placeholder="you@example.com"
                              className="focus:border-brand/70 focus:ring-brand/20 h-11 w-full rounded-full border border-white/10 bg-white/10 px-5 text-base text-white transition-colors outline-none placeholder:text-white/35 focus:bg-white/12 focus:ring-2"
                            />
                          </div>

                          <div className="space-y-1.5 text-left">
                            <label
                              htmlFor="password"
                              className="block text-xs font-medium tracking-wide text-white/72"
                            >
                              Password
                            </label>
                            <div className="relative">
                              <input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="new-password"
                                placeholder="At least 8 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) =>
                                  setCapsLockOn(e.getModifierState("CapsLock"))
                                }
                                onKeyUp={(e) =>
                                  setCapsLockOn(e.getModifierState("CapsLock"))
                                }
                                className="focus:border-brand/70 focus:ring-brand/20 h-11 w-full rounded-full border border-white/10 bg-white/10 px-5 pr-12 text-base text-white transition-colors outline-none placeholder:text-white/35 focus:bg-white/12 focus:ring-2"
                              />
                              <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => setShowPassword((v) => !v)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                aria-pressed={showPassword}
                                className="absolute top-1/2 right-3 inline-flex -translate-y-1/2 items-center justify-center text-white/55 transition-colors hover:text-white"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                            {capsLockOn && (
                              <p className="pl-1 text-xs text-amber-300/85">
                                Caps Lock is on.
                              </p>
                            )}
                          </div>

                          <div className="space-y-1.5 text-left">
                            <label
                              htmlFor="confirmPassword"
                              className="block text-xs font-medium tracking-wide text-white/72"
                            >
                              Confirm password
                            </label>
                            <div className="relative">
                              <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                autoComplete="new-password"
                                placeholder="Re-enter your password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                onKeyDown={(e) =>
                                  setCapsLockOn(e.getModifierState("CapsLock"))
                                }
                                onKeyUp={(e) =>
                                  setCapsLockOn(e.getModifierState("CapsLock"))
                                }
                                className="focus:border-brand/70 focus:ring-brand/20 h-11 w-full rounded-full border border-white/10 bg-white/10 px-5 pr-12 text-base text-white transition-colors outline-none placeholder:text-white/35 focus:bg-white/12 focus:ring-2"
                              />
                              <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => setShowConfirmPassword((v) => !v)}
                                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                aria-pressed={showConfirmPassword}
                                className="absolute top-1/2 right-3 inline-flex -translate-y-1/2 items-center justify-center text-white/55 transition-colors hover:text-white"
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                            {passwordsMismatch && (
                              <p className="pl-1 text-xs text-amber-300/85">
                                Passwords don&apos;t match.
                              </p>
                            )}
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
                    className="flex h-10 w-full items-center justify-center gap-2.5 rounded-full border border-white/14 bg-black/14 px-4 text-sm font-medium text-white transition-colors hover:bg-black/22 active:scale-[0.99] disabled:opacity-60"
                  >
                    <Mail className="h-4 w-4" />
                    {loading
                      ? "Creating account..."
                      : showEmailForm
                        ? "Create account"
                        : "Sign up with email"}
                  </button>

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
                          className="mt-2.5 rounded-2xl border border-red-400/15 bg-red-900/20 px-4 py-2.5 text-center text-sm text-red-100/90"
                        >
                          {displayError}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence initial={false}>
                    {showEmailForm && (
                      <motion.div
                        key="email-back"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={panelSpring}
                        style={{ overflow: "hidden" }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            setShowEmailForm(false);
                          }}
                          className="mt-3 inline-flex items-center gap-1.5 text-sm text-white/55 transition-colors hover:text-white"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Back to options
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>
              </div>
            </div>

            {!showEmailForm && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-white/40">
                  <span aria-hidden className="h-px flex-1 bg-white/10" />
                  Already a member
                  <span aria-hidden className="h-px flex-1 bg-white/10" />
                </div>

                <Link
                  href="/sign-in"
                  className="border-brand/45 text-brand hover:border-brand/65 hover:bg-brand/10 hover:text-brand-light flex h-10 w-full items-center justify-center rounded-full border bg-transparent px-4 text-sm font-medium transition-colors active:scale-[0.99]"
                >
                  Sign in
                </Link>
              </div>
            )}

            <p className="mt-2 px-2 text-center text-[11px] leading-relaxed text-white/40">
              By creating an account you agree to our{" "}
              <Link href="/terms" className="text-white/65 underline-offset-4 hover:underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-white/65 underline-offset-4 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
