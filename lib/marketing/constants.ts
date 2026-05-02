import type { Feature, PricingTier, TeamMember, Step, NavLink } from "@/lib/marketing/types";

export const NAV_LINKS: NavLink[] = [
  { label: "Features", href: "/#features" },
  { label: "Brangus", href: "/#brangus" },
  { label: "Pricing", href: "/#pricing" },
  { label: "About Us", href: "/#about" },
];

export const FEATURES: Feature[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    description:
      "View your total livestock portfolio in one place. Track live market-linked pricing, monitor performance over time, and understand where your capital is concentrated across the herd.",
    accentColor: "#E78822",
    accentColorLight: "#EDA659",
    bullets: [
      "See your total livestock portfolio value update in real time",
      "Track live market-linked pricing across every herd",
      "Monitor performance over time with interactive charts",
      "Understand capital concentration across herd groups and properties",
      "Get a clear financial snapshot of your entire operation at a glance",
    ],
    icon: "chart",
  },
  {
    id: "herd-valuation",
    name: "Herd Valuation",
    description:
      "Turn each herd into a live financial asset. Market-linked valuations reflect breed premiums, daily weight gain, breeding activity, and projected biological change, so your balance sheet keeps pace with the paddock.",
    accentColor: "#E78822",
    accentColorLight: "#EDA659",
    bullets: [
      "Add and manage herds as financial assets within your portfolio",
      "Match each herd to live market data with breed premium adjustments",
      "Capture core herd inputs including headcount, weight, age, and class",
      "Track breeding activity, calving rates, and pre-birth accruals across relevant herds",
      "Apply growth and mortality assumptions to project changing herd values over time",
    ],
    icon: "cattle",
  },
  {
    id: "reports",
    name: "Reports",
    description:
      "Generate professional reports your bank manager, accountant, or advisor can actually use. Asset registers, sales summaries, and branded valuation reports, filtered by date range and property, exported as PDF or shared via email.",
    accentColor: "#D4A053",
    accentColorLight: "#E8C07A",
    bullets: [
      "Build asset registers with full herd-by-herd valuations and price source tracking",
      "Generate accountant-ready summaries with portfolio overview, composition, and sales history",
      "Filter by date range and property for precise reporting periods",
      "Export branded PDF reports or share directly via email",
      "Track sales performance with gross, freight, and net breakdowns",
    ],
    icon: "document",
  },
  {
    id: "advisory-hub",
    name: "Advisory Hub",
    description:
      "Give your banker, agent, accountant, or insurer a window into your portfolio, on your terms. Advisors request time-limited access, you approve or deny, and they get read-only tools purpose-built for professional analysis.",
    accentColor: "#1E5C8C",
    accentColorLight: "#2F8CD9",
    bullets: [
      "Grant read-only portfolio access to trusted advisors",
      "Approve or deny access requests and revoke at any time",
      "Advisors get dedicated tools including valuation overlays and scenario modelling",
      "Browse a directory of advisors by role, company, and region",
      "Keep full control and revoke access at any time",
    ],
    icon: "briefcase",
  },
  {
    id: "yard-book",
    name: "Yard Book",
    description:
      "Your digital run sheet. Track every mustering, vet visit, breeding event, maintenance job, and personal reminder in one place, with colour-coded categories, recurring schedules, and horizon-based grouping so nothing falls through the cracks.",
    accentColor: "#87B11B",
    accentColorLight: "#A3CC3D",
    bullets: [
      "Create events across five categories: Health, Mustering, Maintenance, Breeding, and Admin",
      "Set recurring schedules and reminder offsets so you are always ahead",
      "Link events to one or more herds for full operational context",
      "View tasks grouped by horizon: Overdue, Today, Next 7 Days, Next 30, and beyond",
      "Mark items complete and track progress across your operation",
    ],
    icon: "calendar",
  },
  {
    id: "freight-iq",
    name: "Freight IQ",
    description:
      "Estimate transport costs before you commit cattle to market. Industry-standard loading densities, real driving distances, and full cost breakdowns so you can compare markets net of freight and find the best return.",
    accentColor: "#1399EC",
    accentColorLight: "#64BBF5",
    bullets: [
      "11 transport categories with weight-based escalation pricing",
      "Real road-distance routing for freight estimates",
      "Per-head, per-deck, and total cost breakdown including GST",
      "Save estimates for future reference and side-by-side comparison",
      "Feed results into Grid IQ for net-of-freight market vs processor analysis",
    ],
    icon: "truck",
  },
  {
    id: "ch40",
    name: "Ch 40",
    description:
      "Tune in to other producers in your region. Build a trusted peer network to share operational insights, compare notes on markets and conditions, and collaborate on the challenges only another farmer understands.",
    accentColor: "#7C6DD8",
    accentColorLight: "#A094E8",
    bullets: [
      "Browse a directory of producers and send connection requests",
      "Build a permanent network of trusted peers across your region",
      "Message connections directly with thread-based chat",
      "Share insights on markets, conditions, and service providers",
      "Control your visibility and opt in or out of the producer directory",
    ],
    icon: "globe",
  },
  {
    id: "grid-iq",
    name: "Grid IQ",
    description:
      "Compare the saleyard against the processor before you sell. Upload grids via photo or PDF, let AI extract the data, build a test consignment from your portfolio, and see which channel nets the best return. Then track kill sheets to sharpen future decisions.",
    accentColor: "#00B4A0",
    accentColorLight: "#33D4C0",
    bullets: [
      "AI-powered grid extraction from photos, PDFs, and spreadsheets",
      "Net market vs net processor comparison including freight",
      "Processor fit scoring and sell window indicator per category",
      "Post-kill analysis with Grid Capture Ratio, Realisation Factor, and Kill Score",
      "Build a kill sheet library that improves your predictions over time",
    ],
    icon: "grid",
  },
  {
    id: "markets",
    name: "Markets",
    description:
      "Live market data at your fingertips. National indicators, saleyard category prices, and trend signals, updated daily so you can time your decisions with confidence.",
    accentColor: "#E8594E",
    accentColorLight: "#F08070",
    bullets: [
      "National price indicators for beef cattle, sheep, pigs, and goats with trend signals",
      "Saleyard category prices aggregated across Australian markets",
      "Track price movements over time by category and region",
      "Spot trends early with up, down, and flat market signals",
      "Data feeds directly into your portfolio valuations and insight engine",
    ],
    icon: "trending",
  },
  {
    id: "insights",
    name: "Insights",
    description:
      "Your AI stock advisor evaluates your portfolio every day against live market conditions and surfaces the calls that matter. Sell vs hold, optimal timing, weight targets, best market, price sensitivity, and calving forecasts.",
    accentColor: "#E78822",
    accentColorLight: "#EDA659",
    bullets: [
      "Daily AI evaluation of your portfolio against current market data",
      "Sell vs hold analysis with projected gains over 30, 60, and 90 days",
      "Optimal sale month identification based on historical seasonal pricing",
      "Calving forecasts tracking gestation progress and expected calf value",
      "Yard Book alerts surfacing overdue and upcoming tasks",
    ],
    icon: "brain",
  },
];

export const HOW_IT_WORKS_STEPS: Step[] = [
  {
    number: 1,
    title: "Add your herds",
    description:
      "Enter your livestock details: species, breed, head count, and weight. Import from CSV or add manually. Set up your properties and assign markets.",
  },
  {
    number: 2,
    title: "Get real-time valuations",
    description:
      "Live market data prices your herds automatically. Watch your portfolio value update daily with breeding accruals, weight gain projections, and mortality adjustments.",
  },
  {
    number: 3,
    title: "Make smarter decisions",
    description:
      "AI-powered insights tell you when to sell, where to sell, and what you will net after freight. Generate professional reports for the bank or your accountant.",
  },
];

export const PRICING_TIERS: PricingTier[] = [
  // Producer Plans
  {
    id: "ringer",
    name: "The Sirloin",
    subtitle: "1 Property",
    price: 89,
    priceAnnual: null,
    description: "Lean, honest, and ready to work.",
    highlighted: false,
    category: "producer",
    image: "/images/cuts/cut-sirloin-v3.webp",
    features: [
      { name: "1 property", included: true },
      { name: "Unlimited herds", included: true },
      { name: "Live market pricing", included: true },
      { name: "Yard Book with reminders", included: true },
      { name: "Portfolio reports", included: true },
      { name: "Insights", included: true },
      { name: "Brangus Intelligence", included: true },
      { name: "Freight IQ", included: true },
      { name: "Ch 40", included: true },
    ],
  },
  {
    id: "stockman",
    name: "The Ribeye",
    subtitle: "Up to 3 Properties",
    price: 159,
    priceAnnual: null,
    description: "More marbling. More room to grow.",
    highlighted: false,
    category: "producer",
    image: "/images/cuts/cut-ribeye-v3.webp",
    features: [
      { name: "Up to 3 properties", included: true },
      { name: "Unlimited herds", included: true },
      { name: "Live market pricing", included: true },
      { name: "Yard Book with reminders", included: true },
      { name: "Advanced reports", included: true },
      { name: "Insights", included: true },
      { name: "Brangus Intelligence", included: true },
      { name: "Freight IQ", included: true },
      { name: "Ch 40", included: true },
    ],
  },
  {
    id: "head-stockman",
    name: "The Tomahawk",
    subtitle: "4+ Properties",
    price: 249,
    priceAnnual: null,
    description: "The showpiece, built for the big yards.",
    highlighted: false,
    category: "producer",
    image: "/images/cuts/cut-tomahawk-v3.webp",
    features: [
      { name: "4+ properties", included: true },
      { name: "Unlimited herds", included: true },
      { name: "Live market pricing", included: true },
      { name: "Yard Book with reminders", included: true },
      { name: "Advanced reports", included: true },
      { name: "Insights", included: true },
      { name: "Brangus Intelligence", included: true },
      { name: "Freight IQ", included: true },
      { name: "Ch 40", included: true },
    ],
  },
  // Advisor Plans
  {
    id: "advisor",
    name: "Advisor",
    subtitle: "Professional",
    price: null,
    priceLabel: "TBA",
    priceAnnual: null,
    description:
      "For independent agri bankers, livestock agents, accountants, and insurers managing a smaller client book.",
    highlighted: false,
    category: "advisor",
    features: [
      { name: "Up to 15 active clients", included: true },
      { name: "Advisor Lens overlays", included: true },
      { name: "Named scenarios (Conservative, Bank Policy, Custom)", included: true },
      { name: "Simulator sandbox", included: true },
      { name: "Time-limited client permissions", included: true },
      { name: "Advisor valuation reports", included: true },
      { name: "Market Monitor", included: true },
      { name: "Insights", included: true },
      { name: "Freight IQ", included: true },
      { name: "100 Brangus AI queries/month", included: true },
    ],
  },
  {
    id: "head-advisor",
    name: "Head Advisor",
    subtitle: "Enterprise",
    price: null,
    priceLabel: "TBA",
    priceAnnual: null,
    description: "For firms, institutions and practices managing larger client books.",
    highlighted: false,
    category: "advisor",
    features: [
      { name: "Unlimited active clients", included: true },
      { name: "Everything in Advisor", included: true },
      { name: "Freight IQ", included: true },
      { name: "250 Brangus AI queries/month", included: true },
      { name: "All premium reports", included: true },
      { name: "Dedicated onboarding support", included: true },
      { name: "Priority support", included: true },
    ],
  },
];

export const TEAM_MEMBERS: TeamMember[] = [
  {
    name: "Luke St. George",
    role: "Chief Executive Officer",
    email: "luke@stockmanswallet.com.au",
    bio: "Leading the vision for capital intelligence in Australian agriculture.",
    image: "/images/luke.webp",
  },
  {
    name: "Mil Jayaratne",
    role: "Chief Operating Officer",
    email: "mil@stockmanswallet.com.au",
    bio: "Driving operations and strategy to bring Stockman's Wallet to market.",
    image: "/images/mil.webp",
  },
  {
    name: "Leon Ernst",
    role: "Chief Technology Officer",
    email: "leon@stockmanswallet.com.au",
    bio: "Building the technology that powers intelligent livestock valuation.",
    image: "/images/leon.webp",
  },
];
