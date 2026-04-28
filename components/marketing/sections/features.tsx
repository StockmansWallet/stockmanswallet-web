"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  TrendingUp,
  BookOpen,
  FileText,
  Truck,
  Grid3x3,
  Users,
  Radio,
  Lightbulb,
} from "lucide-react";
import { ADVISOR_ENABLED } from "@/lib/feature-flags";
import { IconCattleTags } from "@/components/icons/icon-cattle-tags";

interface FeatureTab {
  id: string;
  name: string;
  tagline: string;
  description: string;
  color: string;
  colorLight: string;
  colorDark: string;
  bullets: string[];
  mockup: string;
  video?: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
}

const FEATURE_TABS: FeatureTab[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    tagline: "Your herds at a glance",
    description:
      "View your total livestock portfolio in one place. Track live market-linked pricing, monitor performance over time, and understand where your capital is concentrated across the herd.",
    color: "var(--feature-dashboard)",
    colorLight: "var(--feature-dashboard-light)",
    colorDark: "var(--feature-dashboard-dark)",
    bullets: [
      "See your total livestock portfolio value update in real time",
      "Track live market-linked pricing across every herd",
      "Monitor performance over time with interactive charts",
      "Understand capital concentration across herd groups and properties",
      "Get a clear financial snapshot of your entire operation at a glance",
    ],
    mockup: "/images/iphone-dashboard-screen.webp",
    icon: <Wallet className="h-5 w-5" />,
  },
  {
    id: "herds",
    name: "Herd Valuation",
    tagline: "Live financial assets",
    description:
      "Turn each herd into a live financial asset. Market-linked valuations reflect breed premiums, daily weight gain, breeding activity, and projected biological change, so your balance sheet keeps pace with the paddock.",
    color: "var(--feature-herds)",
    colorLight: "var(--feature-herds-light)",
    colorDark: "var(--feature-herds-dark)",
    bullets: [
      "Add and manage herds as financial assets within your portfolio",
      "Match each herd to live market data with breed premium adjustments",
      "Capture core herd inputs including headcount, weight, age, and class",
      "Track breeding activity, calving rates, and pre-birth accruals across relevant herds",
      "Apply growth and mortality assumptions to project changing herd values over time",
    ],
    mockup: "/images/iphone-screen-herds-comp.webp",
    icon: <IconCattleTags className="h-5 w-5" />,
  },
  {
    id: "reports",
    name: "Reports",
    tagline: "Bank-ready in one tap",
    description:
      "Generate professional reports your bank manager, accountant, or advisor can actually use. Asset registers, sales summaries, and branded valuation reports, filtered by date range and property, exported as PDF or shared via email.",
    color: "var(--feature-reports)",
    colorLight: "var(--feature-reports-light)",
    colorDark: "var(--feature-reports-dark)",
    bullets: [
      "Build asset registers with full herd-by-herd valuations and price source tracking",
      "Generate accountant-ready summaries with portfolio overview, composition, and sales history",
      "Filter by date range and property for precise reporting periods",
      "Export branded PDF reports or share directly via email",
      "Track sales performance with gross, freight, and net breakdowns",
    ],
    mockup: "/images/iphone-screen-reports.webp",
    icon: <FileText className="h-5 w-5" />,
  },
  // Advisory Hub feature tab - hidden when advisor feature flag is off
  ...(ADVISOR_ENABLED
    ? ([
        {
          id: "advisory",
          name: "Advisory Hub",
          tagline: "Your portfolio, your terms",
          description:
            "Give your banker, agent, accountant, or insurer a window into your portfolio, on your terms. Advisors request time-limited access, you approve or deny, and they get read-only tools purpose-built for professional analysis.",
          color: "var(--feature-advisory)",
          colorLight: "var(--feature-advisory-light)",
          colorDark: "var(--feature-advisory-dark)",
          bullets: [
            "Grant read-only portfolio access to trusted advisors",
            "Approve or deny access requests and revoke at any time",
            "Advisors get dedicated tools including valuation overlays and scenario modelling",
            "Browse a directory of advisors by role, company, and region",
            "Keep full control and revoke access at any time",
          ],
          mockup: "/images/iphone-screen-advisor-directory.webp",
          icon: <Users className="h-5 w-5" />,
        },
      ] as FeatureTab[])
    : []),
  {
    id: "yardbook",
    name: "Yard Book",
    tagline: "Your digital run sheet",
    description:
      "Your digital run sheet. Track every mustering, vet visit, breeding event, maintenance job, and personal reminder in one place, with colour-coded categories, recurring schedules, and horizon-based grouping so nothing falls through the cracks.",
    color: "var(--feature-yardbook)",
    colorLight: "var(--feature-yardbook-light)",
    colorDark: "var(--feature-yardbook-dark)",
    bullets: [
      "Create events across five categories: Health, Mustering, Maintenance, Breeding, and Admin",
      "Set recurring schedules and reminder offsets so you are always ahead",
      "Link events to one or more herds for full operational context",
      "View tasks grouped by horizon: Overdue, Today, Next 7 Days, Next 30, and beyond",
      "Mark items complete and track progress across your operation",
    ],
    mockup: "/images/iphone-screen-yardbook.webp",
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    id: "freight",
    name: "Freight IQ",
    tagline: "Know the cost before you commit",
    description:
      "Estimate transport costs before you commit cattle to market. Industry-standard loading densities, real driving distances, and full cost breakdowns so you can compare markets net of freight and find the best return.",
    color: "var(--feature-freight)",
    colorLight: "var(--feature-freight-light)",
    colorDark: "var(--feature-freight-dark)",
    bullets: [
      "11 transport categories with weight-based escalation pricing",
      "Real driving distances calculated via Apple Maps",
      "Per-head, per-deck, and total cost breakdown including GST",
      "Save estimates for future reference and side-by-side comparison",
      "Feed results into Grid IQ for net-of-freight market vs processor analysis",
    ],
    mockup: "/images/iphone-screen-freight.webp",
    icon: <Truck className="h-5 w-5" />,
  },
  {
    id: "network",
    name: "Ch 40",
    tagline: "The Producer Channel",
    description:
      "Tune in to other producers in your region. Build a trusted peer network to share operational insights, compare notes on markets and conditions, and collaborate on the challenges only another farmer understands.",
    color: "var(--feature-network)",
    colorLight: "var(--feature-network-light)",
    colorDark: "var(--feature-network-dark)",
    bullets: [
      "Browse a directory of producers and send connection requests",
      "Build a permanent network of trusted peers across your region",
      "Message connections directly with thread-based chat",
      "Share insights on markets, conditions, and service providers",
      "Control your visibility and opt in or out of the producer directory",
    ],
    mockup: "/images/iphone-screen-producernetwork.webp",
    icon: <Radio className="h-5 w-5" />,
  },
  {
    id: "gridiq",
    name: "Grid IQ",
    tagline: "Market vs processor",
    description:
      "Compare the saleyard against the processor before you sell. Upload grids via photo or PDF, let AI extract the data, build a test consignment from your portfolio, and see which channel nets the best return. Then track kill sheets to sharpen future decisions.",
    color: "var(--feature-gridiq)",
    colorLight: "var(--feature-gridiq-light)",
    colorDark: "var(--feature-gridiq-dark)",
    bullets: [
      "AI-powered grid extraction from photos, PDFs, and spreadsheets",
      "Net market vs net processor comparison including freight",
      "Processor fit scoring and sell window indicator per category",
      "Post-kill analysis with Grid Capture Ratio, Realisation Factor, and Kill Score",
      "Build a kill sheet library that improves your predictions over time",
    ],
    mockup: "/images/iphone-screen-gridiq.webp",
    icon: <Grid3x3 className="h-5 w-5" />,
    comingSoon: true,
  },
  {
    id: "markets",
    name: "Markets",
    tagline: "Live market intelligence",
    description:
      "Live market data at your fingertips. National indicators, saleyard category prices, and trend signals, updated daily so you can time your decisions with confidence.",
    color: "var(--feature-markets)",
    colorLight: "var(--feature-markets-light)",
    colorDark: "var(--feature-markets-dark)",
    bullets: [
      "National price indicators for beef cattle, sheep, pigs, and goats with trend signals",
      "Saleyard category prices aggregated across Australian markets",
      "Track price movements over time by category and region",
      "Spot trends early with up, down, and flat market signals",
      "Data feeds directly into your portfolio valuations and insight engine",
    ],
    mockup: "/images/iphone-screen-markets.webp",
    icon: <TrendingUp className="h-5 w-5" />,
  },
  {
    id: "insights",
    name: "Insights",
    tagline: "Brangus Powered Decisions",
    description:
      "Brangus evaluates your portfolio every day against live market conditions and surfaces the calls that matter. Sell vs hold, optimal timing, weight targets, best market, price sensitivity, calving forecasts and much more.",
    color: "var(--feature-insights)",
    colorLight: "var(--feature-insights-light)",
    colorDark: "var(--feature-insights-dark)",
    bullets: [
      "Daily evaluation of your portfolio against current market data",
      "Sell vs hold analysis with projected gains over 30, 60, and 90 days",
      "Optimal sale month identification based on historical seasonal pricing",
      "Calving forecasts tracking gestation progress and expected calf value",
      "Yard Book alerts surfacing overdue and upcoming tasks",
    ],
    mockup: "/images/iphone-screen-insights.webp",
    icon: <Lightbulb className="h-5 w-5" />,
  },
];

function FeatureVideo({ src, isActive }: { src: string; isActive: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (isActive) {
      video.currentTime = 0;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isActive]);

  return <video ref={ref} src={src} autoPlay muted loop playsInline className="w-full" />;
}

export default function Features() {
  const [active, setActive] = useState(0);
  const feature = FEATURE_TABS[active];

  function goPrev() {
    setActive((prev) => (prev - 1 + FEATURE_TABS.length) % FEATURE_TABS.length);
  }

  function goNext() {
    setActive((prev) => (prev + 1) % FEATURE_TABS.length);
  }

  return (
    <section id="features" className="relative py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="text-brand text-sm font-medium tracking-wider uppercase">Features</span>
          <h2 className="mt-3 text-3xl font-semibold text-balance text-white sm:text-4xl lg:text-5xl">
            Everything you need to manage <br className="hidden sm:block" />
            <span className="text-brand">livestock as financial assets</span>
          </h2>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-12 flex justify-center"
        >
          <div className="scrollbar-none inline-flex max-w-full flex-nowrap justify-start gap-1 overflow-x-auto rounded-full border border-white/[0.08] bg-white/[0.03] p-1.5 backdrop-blur-sm sm:max-w-3xl sm:flex-wrap sm:justify-center sm:overflow-visible">
            {FEATURE_TABS.map((tab, i) => (
              <button
                key={tab.id}
                onClick={() => setActive(i)}
                className={`focus-visible:ring-brand relative flex shrink-0 cursor-pointer items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors duration-300 focus-visible:ring-2 focus-visible:outline-none ${
                  active === i ? "" : "text-white/50 hover:text-white/75"
                }`}
                style={active === i ? { color: tab.color } : undefined}
              >
                {active === i && (
                  <motion.div
                    layoutId="featureTab"
                    className="absolute inset-0 rounded-full"
                    style={{ background: `${tab.color}15`, border: `1px solid ${tab.color}30` }}
                    transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
                  />
                )}
                <span className="relative z-10">{tab.icon}</span>
                <span className="relative z-10 hidden sm:inline">{tab.name}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Feature Content */}
        <div className="relative mt-16">
          {/* Prev / Next Arrows */}
          <button
            onClick={goPrev}
            aria-label="Previous feature"
            className="absolute top-1/2 -left-2 z-20 hidden -translate-y-1/2 cursor-pointer items-center justify-center rounded-full p-4 backdrop-blur-sm transition-colors focus-visible:ring-2 focus-visible:outline-none lg:-left-24 lg:flex"
            style={{
              color: feature.colorLight,
              backgroundColor: `color-mix(in srgb, ${feature.color} 15%, transparent)`,
            }}
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            onClick={goNext}
            aria-label="Next feature"
            className="absolute top-1/2 -right-2 z-20 hidden -translate-y-1/2 cursor-pointer items-center justify-center rounded-full p-4 backdrop-blur-sm transition-colors focus-visible:ring-2 focus-visible:outline-none lg:-right-24 lg:flex"
            style={{
              color: feature.colorLight,
              backgroundColor: `color-mix(in srgb, ${feature.color} 15%, transparent)`,
            }}
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>

          <div className="grid items-center gap-8 sm:gap-12 lg:grid-cols-2 lg:gap-20">
            {/* Text */}
            <AnimatePresence mode="wait">
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.4 }}
              >
                <span
                  className="text-sm font-medium tracking-wider uppercase"
                  style={{ color: feature.colorDark }}
                >
                  {feature.tagline}
                </span>
                <h3
                  className="mt-3 flex items-center gap-3 text-2xl font-semibold sm:text-3xl"
                  style={{ color: feature.color }}
                >
                  {feature.name}
                  {feature.comingSoon && (
                    <span
                      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                      style={{
                        backgroundColor: `${feature.color}20`,
                        color: feature.colorLight,
                        border: `1px solid ${feature.color}40`,
                      }}
                    >
                      Coming Soon
                    </span>
                  )}
                </h3>
                <p className="text-text-secondary mt-4 text-base leading-relaxed">
                  {feature.description}
                </p>
                <ul className="mt-6 space-y-3">
                  {feature.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3">
                      <div
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full backdrop-blur-sm"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${feature.color} 15%, transparent)`,
                        }}
                      >
                        <svg
                          aria-hidden="true"
                          className="h-3 w-3"
                          style={{ color: feature.colorLight }}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-text-secondary text-sm">{bullet}</span>
                    </li>
                  ))}
                </ul>

                {/* Mobile prev/next */}
                <div className="mt-8 flex items-center gap-4 lg:hidden">
                  <button
                    onClick={goPrev}
                    aria-label="Previous feature"
                    className="flex cursor-pointer items-center justify-center rounded-full p-3 backdrop-blur-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    style={{
                      color: feature.colorLight,
                      backgroundColor: `color-mix(in srgb, ${feature.color} 15%, transparent)`,
                    }}
                  >
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 19.5L8.25 12l7.5-7.5"
                      />
                    </svg>
                  </button>
                  <span className="text-sm font-medium text-white/50 tabular-nums">
                    {active + 1} / {FEATURE_TABS.length}
                  </span>
                  <button
                    onClick={goNext}
                    aria-label="Next feature"
                    className="flex cursor-pointer items-center justify-center rounded-full p-3 backdrop-blur-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    style={{
                      color: feature.colorLight,
                      backgroundColor: `color-mix(in srgb, ${feature.color} 15%, transparent)`,
                    }}
                  >
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.25 4.5l7.5 7.5-7.5 7.5"
                      />
                    </svg>
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Mockup – frame stays fixed, only screen content crossfades */}
            <div className="relative flex justify-center">
              <div
                className="relative z-10 w-[240px] sm:w-[260px] lg:w-[280px]"
                style={{ aspectRatio: "390 / 844" }}
              >
                <AnimatePresence initial={false}>
                  <motion.div
                    key={feature.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                    className="absolute inset-0"
                  >
                    {feature.video ? (
                      <FeatureVideo
                        src={feature.video}
                        isActive={feature.id === FEATURE_TABS[active].id}
                      />
                    ) : (
                      <Image
                        src={feature.mockup}
                        alt={`${feature.name} screenshot`}
                        width={390}
                        height={844}
                        className="w-full"
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
