/**
 * Subscription tier definitions and feature limits.
 * Must stay in sync with iOS SubscriptionTier.swift and check-entitlements Edge Function.
 */

// Subscription tier identifiers - matches Supabase user_subscriptions.tier values
export type SubscriptionTier =
  | "stockman"
  | "head_stockman"
  | "advisor"
  | "head_advisor";

// User type classification
export type UserType = "farmer" | "advisor";

// Tier display metadata
export const TIER_DISPLAY: Record<
  SubscriptionTier,
  { name: string; subtitle: string; userType: UserType; isFree: boolean }
> = {
  stockman: {
    name: "Stockman",
    subtitle: "Single Property",
    userType: "farmer",
    isFree: true,
  },
  head_stockman: {
    name: "Head Stockman",
    subtitle: "Multi Property",
    userType: "farmer",
    isFree: false,
  },
  advisor: {
    name: "Advisor",
    subtitle: "Professional",
    userType: "advisor",
    isFree: true,
  },
  head_advisor: {
    name: "Head Advisor",
    subtitle: "Enterprise",
    userType: "advisor",
    isFree: false,
  },
};

// Per-tier resource limits
export const TIER_LIMITS: Record<
  SubscriptionTier,
  {
    properties: number | null; // null = unlimited
    clients: number | null; // null = unlimited
    brangusQueries: number;
    freightCalcs: number;
  }
> = {
  stockman: { properties: 1, clients: null, brangusQueries: 50, freightCalcs: 5 },
  head_stockman: {
    properties: null,
    clients: null,
    brangusQueries: 150,
    freightCalcs: 15,
  },
  advisor: { properties: null, clients: 10, brangusQueries: 100, freightCalcs: 10 },
  head_advisor: {
    properties: null,
    clients: null,
    brangusQueries: 250,
    freightCalcs: 25,
  },
};

// Gated features - only available on paid tiers
export type GatedFeature =
  | "gridIQ"
  | "csvImport"
  | "herdScenarioSimulator"
  | "saleyardComparisonReport"
  | "unlimitedProperties"
  | "unlimitedClients";

// Which tiers can access each feature
const FEATURE_TIERS: Record<GatedFeature, SubscriptionTier[]> = {
  gridIQ: ["head_stockman", "head_advisor"],
  csvImport: ["head_stockman", "head_advisor"],
  herdScenarioSimulator: ["head_stockman"],
  saleyardComparisonReport: ["head_stockman", "head_advisor"],
  unlimitedProperties: ["head_stockman"],
  unlimitedClients: ["head_advisor"],
};

/**
 * Check if a tier has access to a gated feature.
 */
export function hasFeature(
  tier: SubscriptionTier,
  feature: GatedFeature
): boolean {
  return FEATURE_TIERS[feature].includes(tier);
}

/**
 * Check if a tier is a free tier.
 */
export function isFreeTier(tier: SubscriptionTier): boolean {
  return TIER_DISPLAY[tier].isFree;
}

/**
 * Check if a tier is a paid tier.
 */
export function isPaidTier(tier: SubscriptionTier): boolean {
  return !TIER_DISPLAY[tier].isFree;
}

/**
 * Get the free tier for a user type.
 */
export function freeTierFor(userType: UserType): SubscriptionTier {
  return userType === "farmer" ? "stockman" : "advisor";
}

/**
 * Get the paid tier for a user type.
 */
export function paidTierFor(userType: UserType): SubscriptionTier {
  return userType === "farmer" ? "head_stockman" : "head_advisor";
}

/**
 * Get the upgrade tier for a given tier.
 */
export function upgradeTierFor(tier: SubscriptionTier): SubscriptionTier {
  const userType = TIER_DISPLAY[tier].userType;
  return paidTierFor(userType);
}

/**
 * Get the display name for a tier.
 */
export function tierDisplayName(tier: SubscriptionTier): string {
  return TIER_DISPLAY[tier]?.name ?? "Stockman";
}
