"use server";

import { createClient } from "@/lib/supabase/server";
import { generateAccountantData } from "@/lib/services/report-service";
import type { ReportData } from "@/lib/types/reports";

export async function fetchAccountantReport(
  startDate: string,
  endDate: string,
  openingBookValue: number,
  financialYearLabel: string,
  financialYearShortTitle: string
): Promise<ReportData> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  return generateAccountantData(
    supabase,
    user.id,
    { reportType: "accountant", startDate, endDate, selectedPropertyIds: [] },
    openingBookValue,
    financialYearLabel,
    financialYearShortTitle
  );
}
