"use server";

// Server action for fetching portfolio movement data
// Called by the client-side PortfolioMovementSection component

import { createClient } from "@/lib/supabase/server";
import { calculatePortfolioMovement } from "@/lib/services/movement-service";
import type { PortfolioMovementSummary } from "@/lib/types/portfolio-movement";

export async function getMovementData(
  startDate: string,
  endDate: string,
  propertyFilter: string[]
): Promise<PortfolioMovementSummary | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const period = {
    preset: "custom" as const,
    startDate,
    endDate,
    label: "Custom",
  };

  return calculatePortfolioMovement(supabase, user.id, period, propertyFilter);
}
