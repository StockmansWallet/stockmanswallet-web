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
export type ConnectionStatus = "pending" | "approved" | "denied" | "expired" | "removed";

// Connection type (advisory vs farmer peer)
export type ConnectionType = "advisory" | "farmer_peer";

// Granular data sharing categories
export interface SharingPermissions {
  herds: boolean;
  properties: boolean;
  reports: boolean;
  valuations: boolean;
}

export const DEFAULT_SHARING_PERMISSIONS: SharingPermissions = {
  herds: true,
  properties: true,
  reports: true,
  valuations: true,
};

export const ALL_OFF_SHARING_PERMISSIONS: SharingPermissions = {
  herds: false,
  properties: false,
  reports: false,
  valuations: false,
};

export function parseSharingPermissions(raw: unknown): SharingPermissions {
  if (raw && typeof raw === "object" && "herds" in raw) {
    const obj = raw as Record<string, unknown>;
    return {
      herds: obj.herds === true,
      properties: obj.properties === true,
      reports: obj.reports === true,
      valuations: obj.valuations === true,
    };
  }
  return { ...DEFAULT_SHARING_PERMISSIONS };
}

export type SharingCategory = keyof SharingPermissions;

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
  sharing_permissions: SharingPermissions;
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
  /**
   * Primary livestock species derived from the producer's active herds
   * (Cattle, Sheep, Pig, Goat). Null when the producer has no herds.
   * Populated by the directory page for card display and species filtering.
   */
  primary_species?: "Cattle" | "Sheep" | "Pig" | "Goat" | null;
  /**
   * Herd-size bucket based on total head across active herds. Null when
   * the producer has no herds. Currently only used on the profile page,
   * not the card, so bite-sized head counts aren't leaked in the directory.
   */
  herd_size_bucket?: "small" | "medium" | "large" | null;
  /**
   * Number of properties (excluding deleted / simulated) owned by the
   * producer. Used on the profile page to hint at operation scale.
   */
  property_count?: number | null;
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
    colorClass: "text-advisor",
    bgClass: "bg-advisor/15",
  },
  {
    key: "accountant",
    label: "Accountant",
    icon: Calculator,
    colorClass: "text-info",
    bgClass: "bg-info/15",
  },
  {
    key: "livestock_agent",
    label: "Livestock Agent",
    icon: HandCoins,
    colorClass: "text-warning",
    bgClass: "bg-warning/15",
  },
  {
    key: "insurer",
    label: "Insurer",
    icon: Shield,
    colorClass: "text-teal",
    bgClass: "bg-teal/15",
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

/**
 * Frozen snapshot of a shared herd. Taken at send time, not a live link,
 * so the receiver sees what was true when the sender shared it.
 */
export interface HerdAttachment {
  type: "herd";
  herd_id: string;
  name: string;
  species: string;
  breed: string;
  category: string;
  head_count: number;
  current_weight: number | null;
  initial_weight: number | null;
  estimated_value: number | null;
}

/**
 * Frozen snapshot of a market price. category + saleyard + data_date are
 * sufficient to re-look-up the price, but the scalar is included so the
 * chat remains readable even if the source row is archived.
 */
export interface PriceAttachment {
  type: "price";
  category: string;
  saleyard: string;
  price_per_kg: number;
  weight_range: string | null;
  breed: string | null;
  data_date: string;
}

export type MessageAttachment = HerdAttachment | PriceAttachment;

export interface AdvisoryMessage {
  id: string;
  connection_id: string;
  sender_user_id: string;
  message_type: MessageType;
  content: string;
  created_at: string;
  attachment?: MessageAttachment | null;
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

// Permission helpers - open-ended access model.
// Data access is granted by the producer and stays active until they stop sharing.
export function hasActivePermission(connection: ConnectionRequest): boolean {
  if (connection.status !== "approved") return false;
  if (connection.permission_granted_at == null) return false;
  if (connection.permission_expires_at != null
      && new Date(connection.permission_expires_at).getTime() <= Date.now()) {
    return false;
  }
  return true;
}

// Returns true only when the connection is active AND the producer has the
// specified sharing category enabled. Use this before surfacing any PII tied
// to that category via the service role.
export function canShare(
  connection: Pick<ConnectionRequest, "status" | "permission_granted_at" | "permission_expires_at" | "sharing_permissions">,
  category: SharingCategory,
): boolean {
  if (connection.status !== "approved") return false;
  if (connection.permission_granted_at == null) return false;
  if (connection.permission_expires_at != null
      && new Date(connection.permission_expires_at).getTime() <= Date.now()) {
    return false;
  }
  const perms = parseSharingPermissions(connection.sharing_permissions);
  return perms[category] === true;
}

// Returns a short label for the sharing state
export function permissionStatusLabel(connection: ConnectionRequest): string {
  if (connection.status !== "approved") return "Not connected";
  if (!hasActivePermission(connection)) return "Not sharing";
  return "Sharing";
}

