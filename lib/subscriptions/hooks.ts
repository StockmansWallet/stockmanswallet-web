"use client";

/**
 * Client-side React hooks for subscription state.
 * Fetches subscription data from Supabase and provides feature access checks.
 * When RevenueCat Web SDK is integrated, these hooks will use RevenueCat instead.
 */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SubscriptionTier, GatedFeature } from "./tiers";
import { TIER_LIMITS, hasFeature, TIER_DISPLAY } from "./tiers";

interface SubscriptionState {
  tier: SubscriptionTier;
  isActive: boolean;
  isLoading: boolean;
  displayName: string;
  isFree: boolean;
}

interface UsageState {
  brangusQueries: number;
  brangusLimit: number;
  brangusRemaining: number;
  freightCalculations: number;
  freightLimit: number;
  freightRemaining: number;
  isLoading: boolean;
}

/**
 * Hook to get the current user's subscription state.
 * Fetches from Supabase user_subscriptions table.
 */
export function useSubscription(userId: string | null): SubscriptionState {
  const [state, setState] = useState<SubscriptionState>({
    tier: "stockman",
    isActive: false,
    isLoading: true,
    displayName: "Stockman",
    isFree: false,
  });

  useEffect(() => {
    if (!userId) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    const supabase = createClient();

    async function fetchSubscription() {
      const { data } = await supabase
        .from("user_subscriptions")
        .select("tier, is_active")
        .eq("user_id", userId!)
        .limit(1)
        .single();

      const tier = (data?.tier as SubscriptionTier) ?? "stockman";
      const display = TIER_DISPLAY[tier];

      setState({
        tier,
        isActive: data?.is_active ?? false,
        isLoading: false,
        displayName: display?.name ?? "Stockman",
        isFree: display?.isFree ?? false,
      });
    }

    fetchSubscription();
  }, [userId]);

  return state;
}

/**
 * Hook to get the current user's usage for the current billing period.
 */
export function useUsage(userId: string | null, tier: SubscriptionTier): UsageState {
  const [state, setState] = useState<UsageState>({
    brangusQueries: 0,
    brangusLimit: TIER_LIMITS[tier].brangusQueries,
    brangusRemaining: TIER_LIMITS[tier].brangusQueries,
    freightCalculations: 0,
    freightLimit: TIER_LIMITS[tier].freightCalcs,
    freightRemaining: TIER_LIMITS[tier].freightCalcs,
    isLoading: true,
  });

  useEffect(() => {
    if (!userId) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    const supabase = createClient();
    const limits = TIER_LIMITS[tier];

    async function fetchUsage() {
      const now = new Date();
      const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

      const { data } = await supabase
        .from("usage_tracking")
        .select("brangus_queries, freight_calculations")
        .eq("user_id", userId!)
        .eq("period_start", periodStart)
        .limit(1)
        .single();

      const brangusUsed = data?.brangus_queries ?? 0;
      const freightUsed = data?.freight_calculations ?? 0;

      setState({
        brangusQueries: brangusUsed,
        brangusLimit: limits.brangusQueries,
        brangusRemaining: Math.max(0, limits.brangusQueries - brangusUsed),
        freightCalculations: freightUsed,
        freightLimit: limits.freightCalcs,
        freightRemaining: Math.max(0, limits.freightCalcs - freightUsed),
        isLoading: false,
      });
    }

    fetchUsage();
  }, [userId, tier]);

  return state;
}

/**
 * Hook to check if the current tier has access to a specific feature.
 */
export function useCanAccess(
  tier: SubscriptionTier,
  feature: GatedFeature
): boolean {
  return hasFeature(tier, feature);
}
