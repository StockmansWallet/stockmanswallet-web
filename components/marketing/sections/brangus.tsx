"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, useInView, AnimatePresence } from "framer-motion";
import SectionCard from "@/components/marketing/ui/section-card";

interface ChatExample {
  userMessage: string;
  assistantMessage: string;
  contextCards: { label: string; value: string; detail: string; color?: string }[];
}

const CHAT_EXAMPLES: ChatExample[] = [
  {
    userMessage: "Brangus, what's the freight cost to get 87 of my heifers to Emerald Saleyards?",
    assistantMessage: `Righto, Emerald's 662 clicks from your place. You're looking at $5,958 plus $596 GST, so $6,554 all up. That's about $68.50 a head. You've got 9 spare spots on that last deck too, so if you've got a few extras worth sending, now's the time to fill it and bring the per-head cost down.`,
    contextCards: [
      { label: "Freight to Emerald", value: "$5,958", detail: "+ $596 GST" },
      { label: "Per Head", value: "$68.48", detail: "87 heifers" },
      { label: "Distance", value: "662 km", detail: "Stockman Downs to Emerald" },
    ],
  },
  {
    userMessage:
      "Brangus, if the market drops 20c/kg over the next month, what does that look like for my entire portfolio?",
    assistantMessage: `Yeah, that'd sting a bit. A 20c drop takes the portfolio from $1.67 million down to $1.58 million, an $83,649 hit. Your breeders cop the worst of it. Not the end of the world if you're sitting tight, but if the indicators keep trending down, you'd want to get those store cattle moving sooner rather than later.`,
    contextCards: [
      { label: "Current Portfolio", value: "$1,665,732", detail: "" },
      { label: "After -20c/kg Drop", value: "$1,582,083", detail: "" },
      { label: "Total Loss", value: "$83,649", detail: "5% decrease", color: "text-error" },
    ],
  },
  {
    userMessage:
      "Brangus I forgot it's Hilary's birthday on the 10th June, I need to book the mustering chopper for next Thursday for the bulls and Campbells utes in for a Service this Friday.",
    assistantMessage: `No worries, all sorted. Hilary's birthday is in the Yard Book for 10 June, chopper's booked for the bulls next Thursday, and Campbells utes are down for service this Friday. I'll ping you a reminder for each one so you can keep your head in the paddock and not in your calendar.`,
    contextCards: [],
  },
  {
    userMessage:
      "Brangus, I've just had a live export order come through for my Yearling Steers on farm at $4.95/kg. Compare to selling at Charters Towers, including transport.",
    assistantMessage: `Good timing on that one. Live export at $4.95/kg puts you at $2,227 per head, cash on farm. Through Charters Towers you're at $4.84/kg, but once you knock out $10.73 a head in freight you're netting $2,167. So the live export order is $60 a head better. Across your 210 steers, that's an extra $12,600 in your pocket. I'd be taking that call.`,
    contextCards: [
      { label: "Live Export Offer", value: "$4.95/kg", detail: "$2,227/h" },
      { label: "Charters Towers", value: "$4.84/kg", detail: "After $10.73 freight" },
      {
        label: "Price Difference",
        value: "+$60/h",
        detail: "Live export advantage",
        color: "text-success",
      },
    ],
  },
];

function BubbleTail({ side, color }: { side: "left" | "right"; color: string }) {
  const isRight = side === "right";
  return (
    <svg
      width="22"
      height="17"
      viewBox="0 0 22.37 16.55"
      fill="none"
      className={`absolute -bottom-[10px] ${isRight ? "right-[4px]" : "left-[4px]"}`}
      style={isRight ? undefined : { transform: "scaleX(-1)" }}
    >
      <path
        d="M0,4.5s1.82-.06,5.8,5.76c3.03,4.43,6.92,5.51,10.01,6.09,4.81.9,8.2-1.45,5.76-1.96-1.77-.37-5.28-2.66-5.09-7.46.21-5.51,2.28-6.94,2.28-6.94L0,4.5Z"
        fill={color}
      />
    </svg>
  );
}

const cardSpring = { type: "spring", stiffness: 300, damping: 28 } as const;

function ContextCard({ card, index }: { card: ChatExample["contextCards"][0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{
        ...cardSpring,
        delay: index * 0.1,
        opacity: { duration: 0.25, delay: index * 0.1 },
      }}
      className="grid h-[78px] w-[148px] grid-rows-[18px_24px_16px] content-center gap-0.5 rounded-xl bg-white/[0.06] px-3 py-2 backdrop-blur-lg sm:w-[162px] sm:px-3.5"
    >
      <div className="flex items-center gap-0.5">
        <span className="text-text-muted flex-1 truncate text-[9px] leading-[18px] font-semibold tracking-wide uppercase sm:text-[10px]">
          {card.label}
        </span>
      </div>
      <span
        className={`truncate text-[17px] leading-6 font-bold tabular-nums ${card.color ?? "text-white"}`}
      >
        {card.value}
      </span>
      <span className="text-text-secondary truncate text-[10px] leading-4">{card.detail}</span>
    </motion.div>
  );
}

const HOLD_DURATION = 26000;

export default function Brangus() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCards, setShowCards] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [phase, setPhase] = useState<"user" | "response" | "holding" | "fading">("user");

  const current = CHAT_EXAMPLES[currentIndex];

  // Sequence: user bubble pops in -> pause -> response pops in -> cards slide in -> hold -> transition
  useEffect(() => {
    if (!inView) return;

    if (phase === "user") {
      // Wait so user can read the question, then show AI response
      const timer = setTimeout(() => {
        setShowResponse(true);
        setPhase("response");
      }, 1500);
      return () => clearTimeout(timer);
    }

    if (phase === "response") {
      // Short pause then show context cards
      const timer = setTimeout(() => {
        setShowCards(true);
        setPhase("holding");
      }, 800);
      return () => clearTimeout(timer);
    }

    if (phase === "holding") {
      const timer = setTimeout(() => {
        // Fade everything out in place
        setPhase("fading");
      }, HOLD_DURATION);
      return () => clearTimeout(timer);
    }

    if (phase === "fading") {
      // Reverse pop: cards first, then AI bubble, then user bubble, then swap
      const t0 = setTimeout(() => setShowCards(false), 0);
      const t1 = setTimeout(() => setShowResponse(false), 300);
      const t2 = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % CHAT_EXAMPLES.length);
        setPhase("user");
      }, 700);
      return () => {
        clearTimeout(t0);
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [phase, inView]);

  return (
    <section id="brangus" className="relative scroll-mt-28 overflow-x-clip">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionCard glowPosition="18% 16%" glowSize="1120px 700px">
          <div className="relative z-10 grid items-center gap-10 sm:gap-16 lg:grid-cols-[minmax(400px,0.82fr)_minmax(0,1.78fr)] lg:gap-8 xl:grid-cols-[minmax(430px,0.9fr)_minmax(0,1.85fr)] xl:gap-10">
            {/* Brangus - anchored to grid, bottom-aligned with left column */}
            <div className="pointer-events-none absolute right-[-95px] bottom-[-58px] z-0 hidden h-[800px] w-[430px] lg:block">
              <Image
                src="/images/brangus-post-dirt2.webp"
                alt="Brangus leaning on a post beside the chat panel"
                fill
                sizes="430px"
                className="object-contain object-right-bottom"
              />
            </div>

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative z-10"
            >
              <span className="text-sm font-medium tracking-wider text-[#4c7fff] uppercase">
                Portfolio Intelligence
              </span>
              <h2 className="mt-3 max-w-[460px] text-3xl leading-[1.08] font-semibold sm:text-4xl lg:text-[44px] xl:text-5xl">
                <span className="text-[#4c7fff]">Meet Brangus.</span>
                <br />
                <span className="text-white">Your intelligent</span>
                <br />
                <span className="inline-block whitespace-nowrap text-white">
                  livestock advisor.
                </span>
                <br />
                <span
                  className="text-brand inline-block whitespace-nowrap"
                  style={{
                    fontFamily: "var(--font-caveat), Caveat, cursive",
                    transform: "rotate(-3.5deg) translateX(3.2em)",
                    fontSize: "0.85em",
                    marginTop: "0.15em",
                    fontWeight: 700,
                  }}
                >
                  and new best mate!
                </span>
              </h2>
              <p className="text-text-secondary mt-6 max-w-[360px] text-base leading-relaxed sm:max-w-[380px]">
                Brangus is the engine room of Stockman&apos;s Wallet. He is always on, with direct
                access to your data, herds, portfolio, tools, and workflows. He analyses the
                numbers, connects the moving parts, and helps drive better decisions across your
                operation.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  "Live herd and portfolio data",
                  "Years of historical market data",
                  "Always on across your operation",
                  "Connected to every tool and workflow",
                  "Manages your Yard Book via conversation",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#4c7fff]/15 backdrop-blur-sm">
                      <svg
                        aria-hidden="true"
                        className="h-3 w-3 text-[#4c7fff]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-text-secondary text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Chat Demo */}
            <motion.div
              ref={ref}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative z-20 min-w-0 pt-16"
            >
              <div className="mr-0 lg:mr-[220px] lg:-translate-x-10 xl:-translate-x-14">
                <motion.div
                  animate={{ opacity: phase === "fading" ? 0 : 1 }}
                  transition={{ duration: 0.4 }}
                >
                  {/* User row */}
                  <div className="flex items-end justify-end gap-2 pb-6 sm:pb-4">
                    <motion.div
                      key={`user-${currentIndex}`}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: [0, 1.05, 1] }}
                      transition={{ duration: 0.45, delay: 0.15, ease: "easeOut" }}
                      style={{ transformOrigin: "bottom right" }}
                      className="relative max-w-[85%] rounded-2xl bg-[#3d4550] px-4 py-2.5 sm:max-w-[75%]"
                    >
                      <p className="text-xs leading-relaxed text-white/90 sm:text-sm">
                        {current.userMessage}
                      </p>
                      <BubbleTail side="right" color="#3d4550" />
                    </motion.div>
                    <motion.div
                      key={`user-av-${currentIndex}`}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className="mb-[-20px] shrink-0 sm:mb-[-28px]"
                    >
                      <Image
                        src="/images/demo-user-profile.webp"
                        alt="User"
                        width={40}
                        height={40}
                        className="h-8 w-8 rounded-full object-cover sm:h-10 sm:w-10"
                      />
                    </motion.div>
                  </div>

                  {/* Brangus row */}
                  <div
                    className="flex items-end gap-2 pb-6"
                    style={{ visibility: showResponse ? "visible" : "hidden" }}
                  >
                    <motion.div
                      animate={{ opacity: showResponse ? 1 : 0, scale: showResponse ? 1 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="mb-[-20px] shrink-0 sm:mb-[-28px]"
                    >
                      <Image
                        src="/images/brangus-chat-profile.webp"
                        alt="Brangus"
                        width={40}
                        height={40}
                        className="h-8 w-8 rounded-full object-cover sm:h-10 sm:w-10"
                      />
                    </motion.div>
                    <motion.div
                      key={`ai-${currentIndex}`}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={
                        showResponse
                          ? { opacity: 1, scale: [0, 1.05, 1] }
                          : { opacity: 0, scale: 0 }
                      }
                      transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
                      style={{ transformOrigin: "bottom left" }}
                      className="relative max-w-[85%] rounded-2xl bg-[#2b4fa8] px-4 py-2.5 sm:max-w-[75%]"
                    >
                      <p className="text-xs leading-relaxed whitespace-pre-line text-white sm:text-sm">
                        {current.assistantMessage}
                      </p>
                      <BubbleTail side="left" color="#2b4fa8" />
                    </motion.div>
                  </div>

                  {/* Context cards */}
                  <div className="mt-8 flex min-h-[76px] flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-2.5">
                    <AnimatePresence>
                      {showCards &&
                        current.contextCards.length > 0 &&
                        current.contextCards.map((card, i) => (
                          <ContextCard
                            key={`${currentIndex}-${card.label}`}
                            card={card}
                            index={i}
                          />
                        ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </div>

              {/* Glow */}
              <div className="absolute -inset-6 -z-10 rounded-3xl bg-[#4c7fff]/[0.04] blur-3xl" />
            </motion.div>
          </div>
        </SectionCard>
      </div>
    </section>
  );
}
