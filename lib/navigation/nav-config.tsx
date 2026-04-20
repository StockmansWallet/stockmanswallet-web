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
} from "lucide-react";
import { IconCattleTags } from "@/components/icons/icon-cattle-tags";
import { ADVISOR_ENABLED } from "@/lib/feature-flags";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  activeClass?: string;
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

// Producer mode - portfolio (core navigation)
export const producerNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <Wallet className="h-5 w-5" /> },
  { label: "Herds", href: "/dashboard/herds", icon: <IconCattleTags className="h-5 w-5" /> },
  { label: "Properties", href: "/dashboard/properties", icon: <MapPinned className="h-5 w-5" /> },
];

// Producer mode - intelligence section
export const producerIntelItems: NavItem[] = [
  { label: "Brangus", href: "/dashboard/brangus", icon: <MessageCircle className="h-5 w-5" />, activeClass: "bg-brangus/15 text-brangus" },
  { label: "Insights", href: "/dashboard/insights", icon: <Lightbulb className="h-5 w-5" />, activeClass: "bg-insights/15 text-insights" },
  { label: "Markets", href: "/dashboard/market", icon: <TrendingUp className="h-5 w-5" />, activeClass: "bg-markets/15 text-markets" },
];

// Producer mode - tools section
export const producerToolItems: NavItem[] = [
  { label: "Yard Book", href: "/dashboard/tools/yard-book", icon: <BookOpen className="h-5 w-5" />, activeClass: "bg-yard-book/15 text-yard-book", notificationTypes: ["yard_book_overdue"], badgeSuppressPrefix: "/dashboard/tools/yard-book" },
  { label: "Reports", href: "/dashboard/tools/reports", icon: <FileText className="h-5 w-5" />, activeClass: "bg-reports/15 text-reports" },
  { label: "Freight IQ", href: "/dashboard/tools/freight", icon: <Truck className="h-5 w-5" />, activeClass: "bg-freight-iq/15 text-freight-iq" },
  { label: "Grid IQ", href: "/dashboard/tools/grid-iq", icon: <Grid3x3 className="h-5 w-5" />, activeClass: "bg-grid-iq/15 text-grid-iq" },
  // Advisory Hub hidden when advisor feature flag is off
  ...(ADVISOR_ENABLED ? [{ label: "Advisory Hub", href: "/dashboard/advisory-hub", icon: <Users className="h-5 w-5" />, activeClass: "bg-advisor/15 text-advisor" }] : []),
  { label: "Producer Network", href: "/dashboard/producer-network", icon: <Handshake className="h-5 w-5" />, activeClass: "bg-producer-network/15 text-producer-network", notificationTypes: ["new_message", "new_connection_request"], badgeSuppressPrefix: "/dashboard/producer-network/connections/" },
];

// Advisor mode - portfolio (core navigation)
export const advisorNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/advisor", icon: <Wallet className="h-5 w-5" />, activeClass: "bg-advisor/15 text-advisor" },
  { label: "Clients", href: "/dashboard/advisor/clients", icon: <Users className="h-5 w-5" />, activeClass: "bg-advisor/15 text-advisor" },
  { label: "Producer Directory", href: "/dashboard/advisor/directory", icon: <Search className="h-5 w-5" />, activeClass: "bg-advisor/15 text-advisor" },
];

// Advisor mode - intelligence section
export const advisorIntelItems: NavItem[] = [
  { label: "Brangus", href: "/dashboard/brangus", icon: <MessageCircle className="h-5 w-5" />, activeClass: "bg-brangus/15 text-brangus" },
  { label: "Insights", href: "/dashboard/insights", icon: <Lightbulb className="h-5 w-5" />, activeClass: "bg-insights/15 text-insights" },
  { label: "Markets", href: "/dashboard/market", icon: <TrendingUp className="h-5 w-5" />, activeClass: "bg-markets/15 text-markets" },
];

// Advisor mode - tools section
export const advisorToolItems: NavItem[] = [
  { label: "Livestock Simulator", href: "/dashboard/advisor/simulator", icon: <FlaskConical className="h-5 w-5" />, activeClass: "bg-red/15 text-red" },
  { label: "Freight IQ", href: "/dashboard/tools/freight", icon: <Truck className="h-5 w-5" />, activeClass: "bg-freight-iq/15 text-freight-iq" },
];

// Admin section (visible in both modes, gated by user_profiles.is_admin)
export const adminItems: NavItem[] = [
  { label: "Waitlist", href: "/dashboard/admin/waitlist", icon: <ClipboardList className="h-5 w-5" />, activeClass: "bg-teal/15 text-teal" },
  { label: "Valuation Lab", href: "/dashboard/admin/valuation", icon: <FlaskConical className="h-5 w-5" />, activeClass: "bg-violet/15 text-violet" },
  { label: "MLA Data Upload", href: "/dashboard/admin/mla-upload", icon: <Upload className="h-5 w-5" />, activeClass: "bg-success/15 text-success" },
];

// Bottom navigation (always visible)
export const bottomNavItems: NavItem[] = [
  { label: "Help Center", href: "/dashboard/help", icon: <HelpCircle className="h-4 w-4" /> },
  { label: "Settings", href: "/dashboard/settings", icon: <Settings className="h-4 w-4" /> },
];

// Mobile flat list per mode (combined main + intel + tools for simpler rendering)
export const producerMobileItems: NavItem[] = [...producerNavItems, ...producerIntelItems, ...producerToolItems];
// Advisor mobile nav only available when feature flag is on
export const advisorMobileItems: NavItem[] = ADVISOR_ENABLED
  ? [...advisorNavItems, ...advisorIntelItems, ...advisorToolItems]
  : [];
