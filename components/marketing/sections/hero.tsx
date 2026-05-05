"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import LandingButton from "@/components/marketing/ui/landing-button";
import SectionCard from "@/components/marketing/ui/section-card";
import { useWaitlist } from "@/components/marketing/ui/waitlist-provider";
import tallyAnimData from "@/public/animations/tally.json";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

const FEATURE_CARDS = [
  {
    src: "/images/insight-calves-on-ground.png",
    alt: "Calves on the Ground insight card",
    frameClassName: "border-success/35",
  },
  {
    src: "/images/insight-portfolio-peak-month.png",
    alt: "Portfolio Peak Month insight card",
    frameClassName: "border-pink/35",
  },
] as const;

const SHOW_FEATURE_CARDS = false;

export default function Hero() {
  const { openWaitlist } = useWaitlist();
  const sectionRef = useRef<HTMLElement>(null);
  const [activeFeatureCard, setActiveFeatureCard] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const phoneYRaw = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const textYRaw = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const phoneY = prefersReducedMotion ? 0 : phoneYRaw;
  const textY = prefersReducedMotion ? 0 : textYRaw;
  const currentFeatureCard = FEATURE_CARDS[activeFeatureCard];

  useEffect(() => {
    if (!SHOW_FEATURE_CARDS) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveFeatureCard((current) => (current + 1) % FEATURE_CARDS.length);
    }, 6500);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section ref={sectionRef} id="hero" className="relative overflow-x-clip pt-28">
      {/* Content */}
      <div className="relative mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <SectionCard
          className="px-6 sm:px-8 lg:px-12"
          glowPosition="60% 20%"
          glowSize="1200px 720px"
        >
          <div className="relative z-10 grid items-center gap-16 lg:grid-cols-2 lg:gap-20">
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
                biological and market movements, compares sale options, and supports better
                decisions with advanced industry intelligence.{" "}
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
                <LandingButton size="md" onClick={openWaitlist}>
                  Join Waitlist
                </LandingButton>
                <p className="text-text-muted mt-3 text-xs">
                  Join the waitlist. We&apos;ll email you before the app launches with early access
                  details.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="mt-8 flex cursor-default items-center gap-4"
                aria-label="App launching June 2026 on the App Store"
              >
                <Image
                  src="/images/download-on-app-store.svg"
                  alt=""
                  aria-hidden="true"
                  width={120}
                  height={40}
                  className="h-10 w-auto opacity-60"
                />
                <span className="text-text-muted text-sm">App launching June 2026</span>
              </motion.div>
            </motion.div>

            {/* Phone Column */}
            <motion.div
              style={{ y: phoneY }}
              className="relative flex h-[360px] items-center justify-center sm:h-[430px] lg:h-[500px]"
            >
              {/* Brangus phone mockup */}
              <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-[-45px] right-[-155px] z-10 h-[500px] max-w-[150vw] sm:top-[-68px] sm:right-[-235px] sm:h-[620px] lg:top-[-96px] lg:right-[-282px] lg:h-[720px] xl:top-[-114px] xl:right-[-318px] xl:h-[780px]"
              >
                <Image
                  src="/images/hero_landing_iPhoneHand.webp"
                  alt="Brangus holding the Stockman's Wallet app dashboard on an iPhone"
                  width={2336}
                  height={1744}
                  className="h-full w-auto max-w-none select-none"
                  priority
                  loading="eager"
                  sizes="(min-width: 1280px) 1045px, (min-width: 1024px) 965px, (min-width: 640px) 831px, 670px"
                />
              </motion.div>

              {SHOW_FEATURE_CARDS ? (
                <>
                  {/* Floating feature card */}
                  <div className="absolute top-[45%] left-[8%] z-20 hidden w-[250px] select-none sm:block sm:w-[285px] lg:top-[47%] lg:left-[2%] lg:w-[315px] xl:left-[-2%] xl:w-[350px]">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.div
                        key={currentFeatureCard.src}
                        initial={
                          prefersReducedMotion
                            ? { opacity: 0 }
                            : { opacity: 0, x: 42, y: 18, rotate: 3, scale: 0.94 }
                        }
                        animate={
                          prefersReducedMotion
                            ? { opacity: 1 }
                            : { opacity: 1, x: 0, y: [0, -10, 0], rotate: 0, scale: 1 }
                        }
                        exit={
                          prefersReducedMotion
                            ? { opacity: 0 }
                            : { opacity: 0, x: -54, y: -20, rotate: -4, scale: 0.96 }
                        }
                        transition={
                          prefersReducedMotion
                            ? { duration: 0.35 }
                            : {
                                opacity: { duration: 0.42 },
                                x: { duration: 0.72, ease: [0.16, 1, 0.3, 1] },
                                rotate: { duration: 0.72, ease: [0.16, 1, 0.3, 1] },
                                scale: { duration: 0.72, ease: [0.16, 1, 0.3, 1] },
                                y: {
                                  duration: 5.5,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                },
                              }
                        }
                        className={`overflow-hidden rounded-[18px] border bg-emerald-950/30 shadow-[0_18px_42px_rgba(0,0,0,0.42)] backdrop-blur-2xl backdrop-saturate-150 ${currentFeatureCard.frameClassName}`}
                      >
                        <Image
                          src={currentFeatureCard.src}
                          alt={currentFeatureCard.alt}
                          width={604}
                          height={314}
                          className="w-full"
                          sizes="(min-width: 1280px) 350px, (min-width: 1024px) 315px, (min-width: 640px) 285px, 250px"
                        />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </>
              ) : null}
            </motion.div>
          </div>
        </SectionCard>
      </div>
    </section>
  );
}
