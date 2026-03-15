/**
 * Server-side subscription utilities.
 * Use in server components, server actions, and API routes.
 * Queries Supabase user_subscriptions table directly.
 */

import { createClient } from "@/lib/supabase/server";
import type { SubscriptionTier } from "./tiers";
import { TIER_LIMITS } from "./tiers";

export interface UserSubscription {
  tier: SubscriptionTier;
  isActive: boolean;
  expiresAt: string | null;
  platform: string | null;
}

export interface UserUsage {
  brangusQueries: number;
  brangusLimit: number;
  brangusRemaining: number;
  freightCalculations: number;
  freightLimit: number;
  freightRemaining: number;
}

/**
 * Get the subscription tier for a user.
 * Returns "stockman" (free farmer tier) if no subscription exists.
 */
export async function getUserTier(
  userId: string
): Promise<SubscriptionTier> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("user_subscriptions")
    .select("tier")
    .eq("user_id", userId)
    .limit(1)
    .single();

  return (data?.tier as SubscriptionTier) ?? "stockman";
}

/**
 * Get full subscription state for a user.
 */
export async function getUserSubscription(
  userId: string
): Promise<UserSubscription> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("user_subscriptions")
    .select("tier, is_active, expires_at, platform")
    .eq("user_id", userId)
    .limit(1)
    .single();

  return {
    tier: (data?.tier as SubscriptionTier) ?? "stockman",
    isActive: data?.is_active ?? false,
    expiresAt: data?.expires_at ?? null,
    platform: data?.platform ?? null,
  };
}

/**
 * Get current period usage for a user.
 */
export async function getUserUsage(
  userId: string
): Promise<UserUsage> {
  const supabase = await createClient();

  const now = new Date();
  const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const { data } = await supabase
    .from("usage_tracking")
    .select("brangus_queries, freight_calculations")
    .eq("user_id", userId)
    .eq("period_start", periodStart)
    .limit(1)
    .single();

  // Get the user's tier for limits
  const tier = await getUserTier(userId);
  const limits = TIER_LIMITS[tier];

  const brangusUsed = data?.brangus_queries ?? 0;
  const freightUsed = data?.freight_calculations ?? 0;

  return {
    brangusQueries: brangusUsed,
    brangusLimit: limits.brangusQueries,
    brangusRemaining: Math.max(0, limits.brangusQueries - brangusUsed),
    freightCalculations: freightUsed,
    freightLimit: limits.freightCalcs,
    freightRemaining: Math.max(0, limits.freightCalcs - freightUsed),
  };
}
