"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { Modal } from "@/components/ui/modal";

interface VerifiedModalProps {
  open: boolean;
  onClose: () => void;
}

export function VerifiedModal({ open, onClose }: VerifiedModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      ariaLabel="Email verified"
      backdropClassName="bg-black/40 backdrop-blur-md"
      panelClassName="rounded-3xl shadow-2xl shadow-black/40"
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="text-text-muted hover:text-text-primary absolute top-4 right-4 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-white/[0.08]"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>

      <div
        className="overflow-hidden rounded-3xl bg-[#17130f] ring-1 ring-white/[0.12] ring-inset"
        style={{
          background:
            "radial-gradient(ellipse 920px 620px at 28% 16%, color-mix(in srgb, var(--color-brand) 22%, transparent), color-mix(in srgb, var(--color-brand) 8%, transparent) 42%, transparent 74%), linear-gradient(180deg, #17130f 0%, #1b1812 40%, #18130f 72%, #120f0d 100%)",
        }}
      >
        <div className="max-h-[84vh] overflow-y-auto px-5 py-8 sm:px-7 sm:py-10">
          <div className="mx-auto w-full max-w-[34rem] space-y-6 text-center sm:space-y-7">
            <div className="mx-auto w-full max-w-[14rem]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/Brangus-wave.webp"
                alt="Brangus giving a wave"
                className="h-auto w-full object-contain drop-shadow-[0_8px_30px_rgba(0,0,0,0.28)]"
              />
            </div>

            <div className="px-2">
              <h1 className="text-[clamp(1.75rem,5vw,2.5rem)] font-semibold tracking-tight text-white">
                You&apos;re all set, mate.
              </h1>
              <p className="mt-3 text-[clamp(0.95rem,2.5vw,1.15rem)] leading-relaxed text-white/72">
                Your email&apos;s verified and your account is good to go. Head back to the app or
                carry on here.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-[#4a4d40]/72 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:p-5">
              <div className="space-y-3">
                <a
                  href="stockmanswallet://"
                  className="bg-brand hover:bg-brand-dark flex min-h-14 w-full items-center justify-center rounded-[1.4rem] px-5 py-3.5 text-base font-semibold text-white transition-colors active:scale-[0.99]"
                >
                  Open Stockman&apos;s Wallet
                </a>

                <Link
                  href="/sign-in"
                  className="flex min-h-14 w-full items-center justify-center rounded-[1.4rem] border border-white/14 bg-black/14 px-5 py-3.5 text-base font-semibold text-white transition-colors hover:bg-black/22 active:scale-[0.99]"
                >
                  Continue on web instead
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
