import {
  Wallet,
  TrendingUp,
  BookOpen,
  FileText,
  Truck,
  Grid3x3,
  Users,
  MessageCircle,
  Lightbulb,
  HelpCircle,
  Settings,
  MapPinned,
  FlaskConical,
  Upload,
  Handshake,
  ClipboardList,
  Search,
  Map as MapIcon,
  FolderOpen,
} from "lucide-react";
import { IconCattleTags } from "@/components/icons/icon-cattle-tags";
import { ADVISOR_ENABLED } from "@/lib/feature-flags";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  activeClass?: string;
  /** Tailwind classes applied on hover when the item is not active. */
  hoverClass?: string;
  inactiveClass?: string; // Override default inactive styling (e.g. Brangus amber glow)
  // Notification types owned by this nav item. Unread counts for these types
  // drive the sidebar badge; clearing happens when the user lands on any
  // route under `href`.
  notificationTypes?: string[];
  // Pathname prefix that should hide the badge while the user is inside
  // it. Narrower than `href` so a feature with a landing index plus
  // detail routes (e.g. Producer Network with its chat pages) can keep
  // the badge visible on the landing and only suppress it while the
  // user is actively reading a thread.
  badgeSuppressPrefix?: string;
}

// Feature-tinted nav styles. Active = feature tint + feature text; hover =
// feature -dark fill + white text (matching the filled-button convention
// we use elsewhere for filled, AA-contrast-safe surfaces). All class names
// are full static literals so Tailwind's JIT picks them up.
type NavFeature =
  | "brand"
  | "brangus"
  | "insights"
  | "markets"
  | "yard-book"
  | "reports"
  | "freight-iq"
  | "grid-iq"
  | "advisor"
  | "producer-network"
  | "red"
  | "teal"
  | "violet"
  | "success";

const FEATURE_NAV: Record<NavFeature, { activeClass: string; hoverClass: string }> = {
  brand: {
    activeClass: "bg-brand/15 text-brand",
    hoverClass: "hover:bg-brand-dark hover:text-white",
  },
  brangus: {
    activeClass: "bg-brangus/15 text-brangus",
    hoverClass: "hover:bg-brangus-dark hover:text-white",
  },
  insights: {
    activeClass: "bg-insights/15 text-insights",
    hoverClass: "hover:bg-insights-dark hover:text-white",
  },
  markets: {
    activeClass: "bg-markets/15 text-markets",
    hoverClass: "hover:bg-markets-dark hover:text-white",
  },
  "yard-book": {
    activeClass: "bg-yard-book/15 text-yard-book",
    hoverClass: "hover:bg-yard-book-dark hover:text-white",
  },
  reports: {
    activeClass: "bg-reports/15 text-reports",
    hoverClass: "hover:bg-reports-dark hover:text-white",
  },
  "freight-iq": {
    activeClass: "bg-freight-iq/15 text-freight-iq",
    hoverClass: "hover:bg-freight-iq-dark hover:text-white",
  },
  "grid-iq": {
    activeClass: "bg-grid-iq/15 text-grid-iq",
    hoverClass: "hover:bg-grid-iq-dark hover:text-white",
  },
  advisor: {
    activeClass: "bg-advisor/15 text-advisor",
    hoverClass: "hover:bg-advisor-dark hover:text-white",
  },
  "producer-network": {
    activeClass: "bg-producer-network/15 text-producer-network",
    hoverClass: "hover:bg-producer-network-dark hover:text-white",
  },
  red: {
    activeClass: "bg-red/15 text-red",
    hoverClass: "hover:bg-red-dark hover:text-white",
  },
  teal: {
    activeClass: "bg-teal/15 text-teal",
    hoverClass: "hover:bg-teal-dark hover:text-white",
  },
  violet: {
    activeClass: "bg-violet/15 text-violet",
    hoverClass: "hover:bg-violet-dark hover:text-white",
  },
  success: {
    activeClass: "bg-success/15 text-success",
    hoverClass: "hover:bg-success-dark hover:text-white",
  },
};

function nav(feature: NavFeature = "brand") {
  return FEATURE_NAV[feature];
}

// Producer mode - portfolio (core navigation)
export const producerNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <Wallet className="h-5 w-5" />, ...nav() },
  {
    label: "Herds",
    href: "/dashboard/herds",
    icon: <IconCattleTags className="h-5 w-5" />,
    ...nav(),
  },
  {
    label: "Properties",
    href: "/dashboard/properties",
    icon: <MapPinned className="h-5 w-5" />,
    ...nav(),
  },
];

// Producer mode - intelligence section
export const producerIntelItems: NavItem[] = [
  {
    label: "Brangus",
    href: "/dashboard/brangus",
    icon: <MessageCircle className="h-5 w-5" />,
    ...nav("brangus"),
    notificationTypes: ["brangus_shared_chat"],
    // Suppress while on the Brangus page - the Shared tab badge takes over.
    badgeSuppressPrefix: "/dashboard/brangus",
  },
  {
    label: "Insights",
    href: "/dashboard/insights",
    icon: <Lightbulb className="h-5 w-5" />,
    ...nav("insights"),
  },
  {
    label: "Markets",
    href: "/dashboard/market",
    icon: <TrendingUp className="h-5 w-5" />,
    ...nav("markets"),
  },
  {
    label: "Saleyards",
    href: "/dashboard/saleyards",
    icon: <MapIcon className="h-5 w-5" />,
    ...nav("markets"),
  },
  {
    label: "Reports",
    href: "/dashboard/tools/reports",
    icon: <FileText className="h-5 w-5" />,
    ...nav("reports"),
  },
];

// Producer mode - tools section
export const producerToolItems: NavItem[] = [
  {
    label: "Yard Book",
    href: "/dashboard/tools/yard-book",
    icon: <BookOpen className="h-5 w-5" />,
    ...nav("yard-book"),
    notificationTypes: ["yard_book_overdue"],
    badgeSuppressPrefix: "/dashboard/tools/yard-book",
  },
  {
    label: "Freight IQ",
    href: "/dashboard/tools/freight",
    icon: <Truck className="h-5 w-5" />,
    ...nav("freight-iq"),
  },
  {
    label: "Grid IQ",
    href: "/dashboard/tools/grid-iq",
    icon: <Grid3x3 className="h-5 w-5" />,
    ...nav("grid-iq"),
  },
  {
    label: "Files",
    href: "/dashboard/tools/files",
    icon: <FolderOpen className="h-5 w-5" />,
    ...nav("brangus"),
  },
  // Advisory Hub hidden when advisor feature flag is off
  ...(ADVISOR_ENABLED
    ? [
        {
          label: "Advisory Hub",
          href: "/dashboard/advisory-hub",
          icon: <Users className="h-5 w-5" />,
          ...nav("advisor"),
        },
      ]
    : []),
  {
    label: "Producer Network",
    href: "/dashboard/producer-network",
    icon: <Handshake className="h-5 w-5" />,
    ...nav("producer-network"),
    notificationTypes: ["new_message", "new_connection_request"],
    badgeSuppressPrefix: "/dashboard/producer-network/connections/",
  },
];

// Advisor mode - portfolio (core navigation)
export const advisorNavItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard/advisor",
    icon: <Wallet className="h-5 w-5" />,
    ...nav("advisor"),
  },
  {
    label: "Clients",
    href: "/dashboard/advisor/clients",
    icon: <Users className="h-5 w-5" />,
    ...nav("advisor"),
  },
  {
    label: "Producer Directory",
    href: "/dashboard/advisor/directory",
    icon: <Search className="h-5 w-5" />,
    ...nav("advisor"),
  },
];

// Advisor mode - intelligence section
export const advisorIntelItems: NavItem[] = [
  {
    label: "Brangus",
    href: "/dashboard/brangus",
    icon: <MessageCircle className="h-5 w-5" />,
    ...nav("brangus"),
    notificationTypes: ["brangus_shared_chat"],
    badgeSuppressPrefix: "/dashboard/brangus",
  },
  {
    label: "Insights",
    href: "/dashboard/insights",
    icon: <Lightbulb className="h-5 w-5" />,
    ...nav("insights"),
  },
  {
    label: "Markets",
    href: "/dashboard/market",
    icon: <TrendingUp className="h-5 w-5" />,
    ...nav("markets"),
  },
];

// Advisor mode - tools section
export const advisorToolItems: NavItem[] = [
  {
    label: "Livestock Simulator",
    href: "/dashboard/advisor/simulator",
    icon: <FlaskConical className="h-5 w-5" />,
    ...nav("red"),
  },
  {
    label: "Freight IQ",
    href: "/dashboard/tools/freight",
    icon: <Truck className="h-5 w-5" />,
    ...nav("freight-iq"),
  },
];

// Admin section (visible in both modes, gated by user_profiles.is_admin)
export const adminItems: NavItem[] = [
  {
    label: "Waitlist",
    href: "/dashboard/admin/waitlist",
    icon: <ClipboardList className="h-5 w-5" />,
    ...nav("teal"),
  },
  {
    label: "Valuation Lab",
    href: "/dashboard/admin/valuation",
    icon: <FlaskConical className="h-5 w-5" />,
    ...nav("violet"),
  },
  {
    label: "MLA Data Upload",
    href: "/dashboard/admin/mla-upload",
    icon: <Upload className="h-5 w-5" />,
    ...nav("success"),
  },
];

// Bottom navigation (always visible)
export const bottomNavItems: NavItem[] = [
  {
    label: "Help Center",
    href: "/dashboard/help",
    icon: <HelpCircle className="h-5 w-5" />,
    ...nav(),
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: <Settings className="h-5 w-5" />,
    ...nav(),
  },
];

// Mobile flat list per mode (combined main + intel + tools for simpler rendering)
export const producerMobileItems: NavItem[] = [
  ...producerNavItems,
  ...producerIntelItems,
  ...producerToolItems,
];
// Advisor mobile nav only available when feature flag is on
export const advisorMobileItems: NavItem[] = ADVISOR_ENABLED
  ? [...advisorNavItems, ...advisorIntelItems, ...advisorToolItems]
  : [];
