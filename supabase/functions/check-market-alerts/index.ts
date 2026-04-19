// ============================================
// SUPABASE EDGE FUNCTION: Check Market Alerts
// ============================================
// File: supabase/functions/check-market-alerts/index.ts
// Deploy: supabase functions deploy check-market-alerts --no-verify-jwt
//
// Debug: Iterates every active market_price_alert and checks whether the
// Debug: latest category_prices average for that target has crossed the
// Debug: user-defined threshold. If so, inserts a notification (7-day
// Debug: re-trigger window) and stamps triggered_at. Designed to run on a
// Debug: cron schedule shortly after the daily MLA scrape.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

type Alert = {
  id: string;
  user_id: string;
  target_kind: "category" | "saleyard";
  target_name: string;
  state: string | null;
  comparator: "above" | "below";
  threshold_cents: number;
  triggered_at: string | null;
  note: string | null;
};

type PriceRow = {
  final_price_per_kg: number;
  data_date: string;
};

// Debug: Compute the head-unweighted average of the most recent data_date
// Debug: that matches the alert target. category_prices stores prices in
// Debug: cents/kg as double precision, so we keep everything in cents here.
async function computeLatestAveragePriceCents(
  client: ReturnType<typeof createClient>,
  alert: Alert,
): Promise<{ avgCents: number; dataDate: string } | null> {
  let query = client
    .from("category_prices")
    .select("final_price_per_kg, data_date, saleyard, state, category")
    .order("data_date", { ascending: false })
    .limit(500);

  if (alert.target_kind === "category") {
    query = query.eq("category", alert.target_name);
    if (alert.state) {
      query = query.eq("state", alert.state);
    }
  } else {
    query = query.eq("saleyard", alert.target_name);
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) {
    return null;
  }

  const latestDate = (data[0] as { data_date: string }).data_date;
  const sameDay = (data as PriceRow[]).filter((r) => r.data_date === latestDate);
  if (sameDay.length === 0) return null;

  const sum = sameDay.reduce((acc, r) => acc + Number(r.final_price_per_kg), 0);
  const avg = sum / sameDay.length;

  return { avgCents: avg, dataDate: latestDate };
}

function isTriggered(alert: Alert, priceCents: number): boolean {
  if (alert.comparator === "above") return priceCents >= alert.threshold_cents;
  return priceCents <= alert.threshold_cents;
}

function canFireAgain(triggeredAt: string | null, now: number): boolean {
  if (!triggeredAt) return true;
  const last = new Date(triggeredAt).getTime();
  return now - last >= SEVEN_DAYS_MS;
}

function notificationBody(alert: Alert, priceCents: number, dataDate: string): {
  title: string;
  body: string;
} {
  const dollars = (priceCents / 100).toFixed(2);
  const threshold = (alert.threshold_cents / 100).toFixed(2);
  const direction = alert.comparator === "above" ? "above" : "below";
  const scope =
    alert.target_kind === "category"
      ? alert.state
        ? `${alert.target_name} in ${alert.state}`
        : alert.target_name
      : alert.target_name;
  return {
    title: `${scope} is ${direction} $${threshold}/kg`,
    body: `Latest average is $${dollars}/kg as of ${dataDate}.`,
  };
}

serve(async (req: Request) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    const { data: alerts, error: alertsError } = await admin
      .from("market_price_alerts")
      .select(
        "id, user_id, target_kind, target_name, state, comparator, threshold_cents, triggered_at, note",
      )
      .eq("is_active", true);

    if (alertsError) {
      console.error("Debug: check-market-alerts - fetch alerts failed:", alertsError.message);
      return new Response(JSON.stringify({ error: alertsError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const now = Date.now();
    let evaluated = 0;
    let fired = 0;
    let skippedNoData = 0;

    for (const alert of (alerts ?? []) as Alert[]) {
      evaluated += 1;

      const priced = await computeLatestAveragePriceCents(admin, alert);
      if (!priced) {
        skippedNoData += 1;
        continue;
      }

      const priceCentsInt = Math.round(priced.avgCents);
      const triggered = isTriggered(alert, priced.avgCents);

      if (triggered && canFireAgain(alert.triggered_at, now)) {
        const { title, body } = notificationBody(alert, priced.avgCents, priced.dataDate);

        const { error: notifError } = await admin.from("notifications").insert({
          user_id: alert.user_id,
          type: "market_price_alert",
          title,
          body,
          link: "/dashboard/settings/alerts",
        });
        if (notifError) {
          console.error(
            "Debug: check-market-alerts - notification insert failed:",
            notifError.message,
          );
        }

        const { error: updError } = await admin
          .from("market_price_alerts")
          .update({
            triggered_at: new Date().toISOString(),
            last_observed_price_cents: priceCentsInt,
          })
          .eq("id", alert.id);
        if (updError) {
          console.error(
            "Debug: check-market-alerts - alert update (fired) failed:",
            updError.message,
          );
        }

        fired += 1;
      } else {
        const { error: updError } = await admin
          .from("market_price_alerts")
          .update({ last_observed_price_cents: priceCentsInt })
          .eq("id", alert.id);
        if (updError) {
          console.error(
            "Debug: check-market-alerts - alert update (observed) failed:",
            updError.message,
          );
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        evaluated,
        fired,
        skipped_no_data: skippedNoData,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Debug: check-market-alerts - unexpected error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
