// Advisory Hub and Advisor Flow types
// Matches iOS models: ClientConnection, DirectoryAdvisor, AdvisorCategory

import type { LucideIcon } from "lucide-react";
import {
  Landmark,
  Calculator,
  HandCoins,
  Shield,
  ScrollText,
} from "lucide-react";

// Connection request lifecycle
export type ConnectionStatus = "pending" | "approved" | "denied" | "expired";

// Connection type (advisory vs farmer peer)
export type ConnectionType = "advisory" | "farmer_peer";

// Matches Supabase connection_requests table
export interface ConnectionRequest {
  id: string;
  requester_user_id: string;
  target_user_id: string;
  requester_name: string;
  requester_role: string;
  requester_company: string;
  status: ConnectionStatus;
  permission_granted_at: string | null;
  permission_expires_at: string | null;
  connection_type: ConnectionType;
  created_at: string;
}

// Farmer profile (for farmer network directory)
export interface DirectoryFarmer {
  user_id: string;
  display_name: string;
  company_name: string;
  role: string;
  state: string;
  region: string;
  bio: string;
}

// Advisor profile from user_profiles (for directory and cards)
export interface DirectoryAdvisor {
  user_id: string;
  display_name: string;
  company_name: string;
  role: string;
  state: string;
  region: string;
  bio: string;
  contact_email: string;
  contact_phone: string;
  is_listed_in_directory: boolean;
}

// Advisor category configuration
export interface AdvisorCategoryConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
}

export const ADVISOR_CATEGORIES: AdvisorCategoryConfig[] = [
  {
    key: "agribusiness_banker",
    label: "Agribusiness Banker",
    icon: Landmark,
    colorClass: "text-purple-400",
    bgClass: "bg-purple-500/15",
  },
  {
    key: "accountant",
    label: "Accountant",
    icon: Calculator,
    colorClass: "text-blue-400",
    bgClass: "bg-blue-500/15",
  },
  {
    key: "livestock_agent",
    label: "Livestock Agent",
    icon: HandCoins,
    colorClass: "text-amber-400",
    bgClass: "bg-amber-500/15",
  },
  {
    key: "insurer",
    label: "Insurer",
    icon: Shield,
    colorClass: "text-teal-400",
    bgClass: "bg-teal-500/15",
  },
  {
    key: "succession_planner",
    label: "Succession Planner",
    icon: ScrollText,
    colorClass: "text-rose-400",
    bgClass: "bg-rose-500/15",
  },
];

// Role mapping: profile form camelCase to Supabase snake_case
const ROLE_MAP: Record<string, string> = {
  producer: "producer",
  agribusinessBanker: "agribusiness_banker",
  livestockAgent: "livestock_agent",
  accountant: "accountant",
  insurer: "insurer",
  successionPlanner: "succession_planner",
};

export function roleToSnakeCase(role: string): string {
  return ROLE_MAP[role] ?? role;
}

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  producer: "Producer",
  agribusiness_banker: "Agribusiness Banker",
  livestock_agent: "Livestock Agent",
  accountant: "Accountant",
  insurer: "Insurer",
  succession_planner: "Succession Planner",
};

export function roleDisplayName(role: string): string {
  const normalized = roleToSnakeCase(role);
  return ROLE_DISPLAY_NAMES[normalized] ?? role;
}

export function isAdvisorRole(role: string): boolean {
  const normalized = roleToSnakeCase(role);
  return normalized !== "producer" && normalized !== "";
}

export function getCategoryConfig(role: string): AdvisorCategoryConfig | undefined {
  const normalized = roleToSnakeCase(role);
  return ADVISOR_CATEGORIES.find((c) => c.key === normalized);
}

// Message types for advisory notes thread
export type MessageType = "general_note" | "access_request" | "renewal_request" | "review_request";

export interface AdvisoryMessage {
  id: string;
  connection_id: string;
  sender_user_id: string;
  message_type: MessageType;
  content: string;
  created_at: string;
}

// Notification types
export type NotificationType =
  | "new_connection_request"
  | "request_approved"
  | "request_denied"
  | "access_expired"
  | "new_message"
  | "renewal_requested"
  | "farmer_connection_request"
  | "farmer_request_approved"
  | "yard_book_reminder"
  | "yard_book_overdue"
  | "price_alert";

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  related_connection_id: string | null;
  created_at: string;
}

// Permission window helpers
export function hasActivePermission(connection: ConnectionRequest): boolean {
  if (connection.status !== "approved") return false;
  if (!connection.permission_expires_at) return false;
  return new Date(connection.permission_expires_at) > new Date();
}

export function permissionTimeRemaining(connection: ConnectionRequest): string {
  if (!connection.permission_expires_at) return "No permission";
  const expires = new Date(connection.permission_expires_at);
  const now = new Date();
  if (expires <= now) return "Expired";

  const diffMs = expires.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days > 0) return `${days}d ${remainingHours}h remaining`;
  if (hours > 0) return `${hours}h remaining`;
  const minutes = Math.floor(diffMs / (1000 * 60));
  return `${minutes}m remaining`;
}
