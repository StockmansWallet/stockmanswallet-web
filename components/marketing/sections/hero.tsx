"use client";

import { useRef } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { motion, useScroll, useTransform } from "framer-motion";
import LandingButton from "@/components/marketing/ui/landing-button";
import { useWaitlist } from "@/components/marketing/ui/waitlist-provider";
import tallyAnimData from "@/public/animations/tally.json";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export default function Hero() {
  const { openWaitlist } = useWaitlist();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const phoneY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, -40]);

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative flex min-h-[100dvh] items-center overflow-x-clip"
    >
      {/* Content */}
      <div className="relative mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-20">
          {/* Text Column */}
          <motion.div style={{ y: textY }} className="flex flex-col items-start">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-6"
            >
              <Lottie
                animationData={tallyAnimData}
                loop={false}
                className="h-[100px] w-[120px] sm:h-[150px] sm:w-[179px]"
              />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-[clamp(1.8rem,3.5vw,3rem)] leading-[1.1] font-semibold tracking-tight text-balance text-white"
            >
              <span className="text-brand">Live. Stock. Market.</span>
              <br />
              Paddock to Portfolio
              <br />
              Intelligence.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-text-secondary mt-6 max-w-lg text-base leading-relaxed sm:text-lg"
            >
              Stockman&apos;s Wallet is a livestock valuation platform built for Australian
              producers and rural advisors. By linking your herds to live market data, it measures
              biological and market movements, compares sale options, and supports better decisions
              with advanced industry intelligence.{" "}
              <span className="text-brand inline-block font-semibold whitespace-nowrap">
                Manage livestock as a portfolio.
              </span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-10"
            >
              <LandingButton size="sm" onClick={openWaitlist}>
                Join Waitlist
              </LandingButton>
              <p className="text-text-muted mt-3 text-xs">
                Join the waitlist. We&apos;ll email you before launch with early access details.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="mt-8 flex items-center gap-4"
            >
              <Image
                src="/images/download-on-app-store.svg"
                alt="Download on the App Store"
                width={120}
                height={40}
                className="h-10 w-auto opacity-75 transition-opacity hover:opacity-100"
              />
              <span className="text-text-muted text-sm">Coming May 2026</span>
            </motion.div>
          </motion.div>

          {/* Phone Column */}
          <motion.div style={{ y: phoneY }} className="relative flex items-center justify-center">
            {/* Phone mockup */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-[260px] sm:w-[280px] lg:w-[300px]"
            >
              <Image
                src="/images/iphone-dashboard-screen.webp"
                alt="Stockman's Wallet app dashboard"
                width={390}
                height={844}
                className="w-full"
                priority
              />
            </motion.div>

            {/* Floating insight card: Sell vs Hold (green) */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.8 }}
              className="absolute top-[25%] left-4 z-20 hidden w-72 rounded-2xl p-5 shadow-2xl lg:block xl:-left-8"
              style={{
                backgroundColor: "rgba(124, 167, 73, 0.08)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(124, 167, 73, 0.15)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="bg-success/15 flex h-9 w-9 items-center justify-center rounded-xl">
                  <svg
                    className="text-success h-4.5 w-4.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Sell vs Hold</p>
                  <p className="text-text-muted text-[10px]">#4 Yearling Steers</p>
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <p className="text-success text-2xl font-bold">+$14,820</p>
                <p className="text-text-muted text-[11px]">potential gain over 90 days</p>
              </div>
              <p className="text-text-secondary mt-1.5 text-[11px] leading-snug">
                #4 Yearling Steers is worth $190,650 today. Holding 90 days projects to $205,470.
              </p>
            </motion.div>

            {/* Floating insight card: Freight IQ (blue) */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 1.0 }}
              className="absolute top-[45%] right-4 z-20 hidden w-72 rounded-2xl p-5 shadow-2xl lg:block xl:-right-8"
              style={{
                backgroundColor: "rgba(19, 153, 236, 0.08)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(19, 153, 236, 0.15)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1399EC]/15">
                  <svg
                    className="h-4.5 w-4.5 text-[#64BBF5]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H21M3.375 14.25h3.75L8.25 9h4.5m0 0l1.125 5.25M12.75 9h4.875c.621 0 1.125.504 1.125 1.125v3.375"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Freight IQ</p>
                  <p className="text-text-muted text-[10px]">87 Heifers to Emerald</p>
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <p className="text-2xl font-bold text-[#64BBF5]">$5,958</p>
                <p className="text-text-muted text-[11px]">+ $596 GST</p>
              </div>
              <p className="text-text-secondary mt-1.5 text-[11px] leading-snug">
                $68.48 per head, 662 km from Stockman Downs to Emerald.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
