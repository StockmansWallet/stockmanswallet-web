// ============================================
// SUPABASE EDGE FUNCTION: Check Yardbook Items
// ============================================
// File: supabase/functions/check-yard-book-items/index.ts
// Deploy: supabase functions deploy check-yard-book-items --no-verify-jwt
//
// Debug: Scans unfinished Yardbook items whose event_date has passed and
// Debug: inserts a yard_book_overdue notification for each one that has not
// Debug: been announced yet. Re-announces when the user extends the item
// Debug: past its previous notification timestamp. Runs on a daily cron at
// Debug: 20:00 UTC (morning Sydney time) via pg_cron + pg_net.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type YardBookItem = {
  id: string;
  user_id: string;
  title: string;
  event_date: string;
  overdue_notified_at: string | null;
};

function formatDueDate(isoDate: string): string {
  // Australian English short date: dd MMM.
  const d = new Date(isoDate);
  const day = d.getUTCDate();
  const month = d.toLocaleString("en-AU", { month: "short", timeZone: "Australia/Sydney" });
  return `${day} ${month}`;
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
    // Overdue items where either we've never announced them, or the user
    // extended the event_date past the last announcement so it's newly
    // overdue again.
    const nowIso = new Date().toISOString();
    const { data: items, error: fetchError } = await admin
      .from("yard_book_items")
      .select("id, user_id, title, event_date, overdue_notified_at")
      .eq("is_completed", false)
      .eq("is_deleted", false)
      .lt("event_date", nowIso);

    if (fetchError) {
      console.error("Debug: check-yard-book-items - fetch failed:", fetchError.message);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const candidates = ((items ?? []) as YardBookItem[]).filter((item) => {
      if (!item.overdue_notified_at) return true;
      return new Date(item.overdue_notified_at) < new Date(item.event_date);
    });

    let fired = 0;

    for (const item of candidates) {
      const due = formatDueDate(item.event_date);

      const { error: notifError } = await admin.from("notifications").insert({
        user_id: item.user_id,
        type: "yard_book_overdue",
        title: `Overdue: ${item.title}`,
        body: `This Yardbook item was due ${due} and is still open.`,
        link: `/dashboard/tools/yard-book/${item.id}`,
      });
      if (notifError) {
        console.error(
          "Debug: check-yard-book-items - notification insert failed:",
          notifError.message,
        );
        continue;
      }

      const { error: updError } = await admin
        .from("yard_book_items")
        .update({ overdue_notified_at: nowIso })
        .eq("id", item.id);
      if (updError) {
        console.error(
          "Debug: check-yard-book-items - item stamp failed:",
          updError.message,
        );
      }

      fired += 1;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        evaluated: items?.length ?? 0,
        fired,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Debug: check-yard-book-items - unexpected error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
