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
} from "lucide-react";
import { IconCattleTags } from "@/components/icons/icon-cattle-tags";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  activeClass?: string;
  inactiveClass?: string; // Override default inactive styling (e.g. Brangus amber glow)
}

// Farmer mode - portfolio (core navigation)
export const farmerNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <Wallet className="h-5 w-5" /> },
  { label: "Herds", href: "/dashboard/herds", icon: <IconCattleTags className="h-5 w-5" /> },
  { label: "Properties", href: "/dashboard/properties", icon: <MapPinned className="h-5 w-5" /> },
];

// Farmer mode - intelligence section
export const farmerIntelItems: NavItem[] = [
  { label: "Ask Brangus", href: "/dashboard/brangus", icon: <MessageCircle className="h-5 w-5" />, activeClass: "bg-[#D9762F]/15 text-[#D9762F]", inactiveClass: "text-[#D9762F]/80 hover:bg-[#D9762F]/10 hover:text-[#D9762F] hover:drop-shadow-[0_0_6px_rgba(217,118,47,0.4)]" },
  { label: "Insights", href: "/dashboard/insights", icon: <Lightbulb className="h-5 w-5" /> },
  { label: "Markets", href: "/dashboard/market", icon: <TrendingUp className="h-5 w-5" /> },
];

// Farmer mode - tools section
export const farmerToolItems: NavItem[] = [
  { label: "Yard Book", href: "/dashboard/tools/yard-book", icon: <BookOpen className="h-5 w-5" />, activeClass: "bg-lime-500/15 text-lime-400" },
  { label: "Reports", href: "/dashboard/tools/reports", icon: <FileText className="h-5 w-5" />, activeClass: "bg-amber-500/15 text-amber-400" },
  { label: "Freight IQ", href: "/dashboard/tools/freight", icon: <Truck className="h-5 w-5" />, activeClass: "bg-sky-500/15 text-sky-400" },
  { label: "Grid IQ", href: "/dashboard/tools/grid-iq", icon: <Grid3x3 className="h-5 w-5" />, activeClass: "bg-teal-500/15 text-teal-400" },
  { label: "Advisory Hub", href: "/dashboard/advisory-hub", icon: <Users className="h-5 w-5" />, activeClass: "bg-[#2F8CD9]/15 text-[#2F8CD9]" },
  { label: "Producer Network", href: "/dashboard/farmer-network", icon: <Handshake className="h-5 w-5" />, activeClass: "bg-orange-500/15 text-orange-400" },
];

// Advisor mode - portfolio (core navigation)
export const advisorNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/advisor", icon: <Wallet className="h-5 w-5" />, activeClass: "bg-[#2F8CD9]/15 text-[#2F8CD9]" },
  { label: "Clients", href: "/dashboard/advisor/clients", icon: <Users className="h-5 w-5" />, activeClass: "bg-[#2F8CD9]/15 text-[#2F8CD9]" },
  { label: "Simulator", href: "/dashboard/advisor/simulator", icon: <FlaskConical className="h-5 w-5" />, activeClass: "bg-[#FF5722]/15 text-[#FF5722]" },
];

// Advisor mode - intelligence section
export const advisorIntelItems: NavItem[] = [
  { label: "Ask Brangus", href: "/dashboard/brangus", icon: <MessageCircle className="h-5 w-5" />, activeClass: "bg-[#D9762F]/15 text-[#D9762F]", inactiveClass: "text-[#D9762F]/80 hover:bg-[#D9762F]/10 hover:text-[#D9762F] hover:drop-shadow-[0_0_6px_rgba(217,118,47,0.4)]" },
  { label: "Insights", href: "/dashboard/insights", icon: <Lightbulb className="h-5 w-5" /> },
  { label: "Markets", href: "/dashboard/market", icon: <TrendingUp className="h-5 w-5" /> },
];

// Advisor mode - tools section
export const advisorToolItems: NavItem[] = [
  { label: "Freight IQ", href: "/dashboard/tools/freight", icon: <Truck className="h-5 w-5" />, activeClass: "bg-sky-500/15 text-sky-400" },
];

// Admin section (visible in both modes, gated by isAdminEmail)
export const adminItems: NavItem[] = [
  { label: "Waitlist", href: "/dashboard/admin/waitlist", icon: <ClipboardList className="h-5 w-5" />, activeClass: "bg-cyan-500/15 text-cyan-400" },
  { label: "Valuation Lab", href: "/dashboard/admin/valuation", icon: <FlaskConical className="h-5 w-5" />, activeClass: "bg-rose-500/15 text-rose-400" },
  { label: "MLA Data Upload", href: "/dashboard/admin/mla-upload", icon: <Upload className="h-5 w-5" />, activeClass: "bg-emerald-500/15 text-emerald-400" },
];

// Bottom navigation (always visible)
export const bottomNavItems: NavItem[] = [
  { label: "Help Center", href: "/dashboard/help", icon: <HelpCircle className="h-4 w-4" /> },
  { label: "Settings", href: "/dashboard/settings", icon: <Settings className="h-4 w-4" /> },
];

// Mobile flat list per mode (combined main + intel + tools for simpler rendering)
export const farmerMobileItems: NavItem[] = [...farmerNavItems, ...farmerIntelItems, ...farmerToolItems];
export const advisorMobileItems: NavItem[] = [...advisorNavItems, ...advisorIntelItems, ...advisorToolItems];
