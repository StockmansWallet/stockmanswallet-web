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
import SectionCard from "@/components/marketing/ui/section-card";

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
  badge?: string;
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
      "Real road-distance routing for freight estimates",
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
    color: "var(--feature-ch40)",
    colorLight: "var(--feature-ch40-light)",
    colorDark: "var(--feature-ch40-dark)",
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
  const proofPoints = feature.bullets.slice(0, 3);

  return (
    <section id="features" className="relative scroll-mt-[6.75rem] overflow-x-clip">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <SectionCard glowPosition="58% 18%" glowSize="1200px 720px">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative z-10 mx-auto max-w-4xl text-center"
          >
            <span className="text-brand text-sm font-medium tracking-wider uppercase">
              Features
            </span>
            <h2 className="mt-3 text-3xl leading-tight font-semibold text-balance text-white sm:text-4xl lg:text-5xl">
              Everything you need to manage
              <br className="hidden sm:block" />
              <span className="text-brand">livestock as financial assets</span>
            </h2>
          </motion.div>

          <div className="scrollbar-none relative z-10 mt-10 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {FEATURE_TABS.map((tab, i) => (
              <button
                key={tab.id}
                onClick={() => setActive(i)}
                aria-pressed={active === i}
                className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                  active === i
                    ? "border-white/15 bg-white/10 text-white"
                    : "border-white/[0.08] bg-white/[0.04] text-white/60"
                }`}
                style={active === i ? { color: tab.colorLight } : undefined}
              >
                {tab.icon}
                <span>{tab.name}</span>
              </button>
            ))}
          </div>

          <div className="relative z-10 mt-14 grid items-start gap-10 lg:grid-cols-[240px_minmax(0,1fr)_340px] lg:gap-12 xl:grid-cols-[260px_minmax(0,1fr)_380px]">
            <motion.nav
              initial={{ opacity: 0, x: -18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              aria-label="Feature selector"
              className="hidden lg:block"
            >
              <div className="space-y-1.5">
                <p className="mb-4 text-xs font-semibold tracking-wider text-white/45 uppercase">
                  Product areas
                </p>
                {FEATURE_TABS.map((tab, i) => {
                  const selected = active === i;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActive(i)}
                      aria-pressed={selected}
                      className={`group relative flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-[14px] px-3 py-3 text-left ring-1 transition-colors ring-inset focus-visible:outline-none ${
                        selected
                          ? "bg-white/[0.09] text-white ring-transparent"
                          : "text-white/58 ring-white/[0.08] hover:bg-white/[0.045] hover:text-white/80"
                      }`}
                    >
                      {selected && (
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0"
                          style={{
                            background: `linear-gradient(to right, color-mix(in srgb, ${tab.color} 22%, transparent), transparent 65%)`,
                          }}
                        />
                      )}
                      {selected && (
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 rounded-[14px]"
                          style={{
                            padding: "1px",
                            background: `linear-gradient(to right, ${tab.color}, color-mix(in srgb, ${tab.color} 0%, transparent) 45%)`,
                            WebkitMask:
                              "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                            WebkitMaskComposite: "xor",
                            maskComposite: "exclude",
                          }}
                        />
                      )}
                      {selected && (
                        <motion.span
                          layoutId="featureRailIndicator"
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0"
                          transition={{ type: "spring", duration: 0.45, bounce: 0.12 }}
                        />
                      )}
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
                        style={{
                          color: selected ? tab.colorLight : undefined,
                          backgroundColor: selected
                            ? `color-mix(in srgb, ${tab.color} 13%, transparent)`
                            : "rgba(255,255,255,0.035)",
                        }}
                      >
                        {tab.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold">{tab.name}</span>
                          {tab.comingSoon && (
                            <span
                              className={`inline-flex shrink-0 items-center rounded-full border px-1.5 py-px text-[10px] font-semibold tracking-wide uppercase ${
                                selected ? "" : "border-white/[0.10] bg-white/[0.04] text-white/55"
                              }`}
                              style={
                                selected
                                  ? {
                                      backgroundColor: `color-mix(in srgb, ${tab.color} 14%, transparent)`,
                                      color: tab.colorLight,
                                      borderColor: `color-mix(in srgb, ${tab.color} 35%, transparent)`,
                                    }
                                  : undefined
                              }
                            >
                              Coming Soon
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-white/48">
                          {tab.tagline}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.nav>

            <div className="min-w-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={feature.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.32, ease: "easeOut" }}
                  className="max-w-xl"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs font-semibold tracking-wider uppercase"
                      style={{ color: feature.colorLight }}
                    >
                      {feature.tagline}
                    </span>
                    {(feature.badge || feature.comingSoon) && (
                      <span
                        className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold"
                        style={{
                          backgroundColor: `${feature.color}18`,
                          color: feature.colorLight,
                          borderColor: `${feature.color}35`,
                        }}
                      >
                        {feature.badge ?? "Coming Soon"}
                      </span>
                    )}
                  </div>

                  <h3
                    className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl"
                    style={{ color: feature.color }}
                  >
                    {feature.name}
                  </h3>

                  <p className="mt-5 text-base leading-relaxed text-white/78 sm:text-lg">
                    {feature.description}
                  </p>

                  <div className="mt-8 grid gap-3">
                    {proofPoints.map((bullet) => (
                      <div key={bullet} className="flex items-start gap-3">
                        <span
                          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                          style={{
                            color: feature.colorLight,
                            backgroundColor: `color-mix(in srgb, ${feature.color} 16%, transparent)`,
                          }}
                        >
                          <svg
                            aria-hidden="true"
                            className="h-3.5 w-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        <span className="text-sm leading-relaxed text-white/74">{bullet}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.15 }}
              className="relative flex justify-center lg:justify-end"
            >
              <div
                aria-hidden="true"
                className="absolute top-1/2 left-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-3xl"
                style={{
                  background: `radial-gradient(circle, ${feature.color} 0%, transparent 62%)`,
                }}
              />
              <div
                className="relative z-10 w-[230px] sm:w-[250px] lg:w-[280px] xl:w-[300px]"
                style={{ aspectRatio: "390 / 844" }}
              >
                <AnimatePresence initial={false}>
                  <motion.div
                    key={feature.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
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
                        sizes="(min-width: 1280px) 300px, (min-width: 1024px) 280px, (min-width: 640px) 250px, 230px"
                        className="w-full drop-shadow-[0_28px_80px_rgba(0,0,0,0.45)]"
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </SectionCard>
      </div>
    </section>
  );
}
