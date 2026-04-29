"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import logoAnimData from "@/public/animations/StockmansLogoAnim.json";
import { updatePassword } from "../actions";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });
const panelSpring = { type: "spring", stiffness: 320, damping: 30, mass: 0.85 } as const;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");

    if (!password || !confirm) {
      setError("Fill in both fields to continue.");
      return;
    }

    if (password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const result = await updatePassword(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/dashboard"), 1500);
  }

  if (success) {
    return (
      <main className="fixed inset-0 z-10 overflow-y-auto">
        <div className="mx-auto flex min-h-screen w-full max-w-[34rem] items-center justify-center px-5 py-10 sm:px-6 sm:py-14">
          <div className="w-full space-y-6 text-center sm:space-y-7">
            <div className="mx-auto w-full max-w-[14rem] drop-shadow-[0_8px_30px_rgba(0,0,0,0.28)] sm:max-w-[16rem]">
              <Lottie animationData={logoAnimData} loop={false} className="h-auto w-full" />
            </div>

            <div className="px-2">
              <h1 className="text-[clamp(2rem,6vw,3rem)] font-semibold tracking-tight text-white">
                Password updated.
              </h1>
              <p className="mt-3 text-[clamp(1rem,3.2vw,1.28rem)] leading-relaxed text-white/72">
                Taking you to your yard now.
              </p>
            </div>
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
              Set a new password.
            </h1>
            <p className="mt-3 text-[clamp(1rem,3.2vw,1.28rem)] leading-relaxed text-white/72">
              Pick something at least 12 characters long.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[#4a4d40]/72 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:p-5">
            <form onSubmit={handleSubmit} noValidate className="space-y-3">
              <AnimatePresence initial={false}>
                {error && (
                  <motion.div
                    key="reset-error"
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
                <label htmlFor="password" className="block text-sm font-medium text-white/78">
                  New password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="At least 12 characters"
                    className="focus:border-brand/70 focus:ring-brand/20 w-full rounded-2xl border border-white/10 bg-white/12 px-4 py-3.5 pr-12 text-base text-white transition-colors outline-none placeholder:text-white/40 focus:bg-white/15 focus:ring-2"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute top-1/2 right-2 inline-flex -translate-y-1/2 items-center justify-center rounded-lg bg-white/5 p-1.5 text-white/70 transition-colors hover:bg-white/12 hover:text-white active:bg-white/15"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-left">
                <label htmlFor="confirm" className="block text-sm font-medium text-white/78">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="confirm"
                    name="confirm"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    className="focus:border-brand/70 focus:ring-brand/20 w-full rounded-2xl border border-white/10 bg-white/12 px-4 py-3.5 pr-12 text-base text-white transition-colors outline-none placeholder:text-white/40 focus:bg-white/15 focus:ring-2"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    aria-pressed={showConfirmPassword}
                    className="absolute top-1/2 right-2 inline-flex -translate-y-1/2 items-center justify-center rounded-lg bg-white/5 p-1.5 text-white/70 transition-colors hover:bg-white/12 hover:text-white active:bg-white/15"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-brand hover:bg-brand-dark flex min-h-16 w-full items-center justify-center rounded-[1.55rem] px-5 py-4 text-base font-semibold text-white transition-colors active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? "Updating..." : "Update password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
