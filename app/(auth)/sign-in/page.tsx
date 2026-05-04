"use client";

import { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Mail } from "lucide-react";
import tallyAnimData from "@/public/animations/tally.json";
import SectionCard from "@/components/marketing/ui/section-card";
import { signIn, signInAsDemo, signInWithApple } from "../actions";
import GoogleSignInButton from "../google-sign-in-button";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });
const panelSpring = { type: "spring", stiffness: 320, damping: 30, mass: 0.85 } as const;

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInScreen />
    </Suspense>
  );
}

function SignInScreen() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const queryErrorCode = searchParams.get("error");
  const queryError =
    queryErrorCode === "demo-failed"
      ? "Couldn't start the demo yard. Please try again."
      : queryErrorCode === "demo-not-configured"
        ? "The demo yard isn't configured right now."
        : queryErrorCode;
  const displayError = error ?? queryError;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setError("Enter your email and password to continue.");
      return;
    }

    setLoading(true);
    const result = await signIn(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
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

            <div className="px-2 lg:max-w-[22rem] lg:px-0">
              <h1 className="text-[clamp(1.65rem,5vw,2.25rem)] font-semibold tracking-tight text-white lg:text-[2.35rem] lg:leading-[1.12]">
                G&apos;day, Stockman.
              </h1>
              <p className="mt-3 text-[clamp(0.95rem,2.5vw,1.08rem)] leading-relaxed text-white/72 lg:text-[1.02rem]">
                Markets move, cattle grow, and the books don&apos;t wait.
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
                    Continue with Apple
                  </button>
                </form>

                <GoogleSignInButton onError={setError} />

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
                            <div className="flex items-baseline justify-between">
                              <label
                                htmlFor="password"
                                className="block text-xs font-medium tracking-wide text-white/72"
                              >
                                Password
                              </label>
                              <Link
                                href="/forgot-password"
                                className="text-brand hover:text-brand-light text-xs font-medium transition-colors"
                              >
                                Forgot password?
                              </Link>
                            </div>
                            <div className="relative">
                              <input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
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
                    {loading ? "Signing in..." : "Continue with email"}
                  </button>

                  <AnimatePresence initial={false}>
                    {displayError && (
                      <motion.div
                        key="sign-in-error"
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
                  New here
                  <span aria-hidden className="h-px flex-1 bg-white/10" />
                </div>

                <Link
                  href="/sign-up"
                  className="border-brand/45 text-brand hover:border-brand/65 hover:bg-brand/10 hover:text-brand-light flex h-10 w-full items-center justify-center rounded-full border bg-transparent px-4 text-sm font-medium transition-colors active:scale-[0.99]"
                >
                  Create account
                </Link>

                <form action={signInAsDemo}>
                  <button
                    type="submit"
                    className="block w-full text-center text-sm text-white/55 transition-colors hover:text-white/80"
                  >
                    Try the demo
                  </button>
                </form>
              </div>
            )}

            <p className="mt-2 px-2 text-center text-[11px] leading-relaxed text-white/40">
              By continuing you agree to our{" "}
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
