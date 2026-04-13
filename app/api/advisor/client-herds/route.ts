import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { parseSharingPermissions } from "@/lib/types/advisory";
import { z } from "zod";

/**
 * POST /api/advisor/client-herds
 * Fetches a client's herds for an authorized advisor.
 * Uses service role to bypass RLS (advisor cannot read another user's herds directly).
 * Read-only - no mutations allowed.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = z.string().uuid().safeParse(body.clientUserId);

  if (!parsed.success) {
    return NextResponse.json({ error: "Valid clientUserId required" }, { status: 400 });
  }

  const clientUserId = parsed.data;

  // Verify active approved connection in either direction (advisor or farmer initiated)
  const { data: connectionRows } = await supabase
    .from("connection_requests")
    .select("*")
    .or(`and(requester_user_id.eq.${user.id},target_user_id.eq.${clientUserId}),and(requester_user_id.eq.${clientUserId},target_user_id.eq.${user.id})`)
    .eq("status", "approved")
    .limit(1);

  const connection = connectionRows?.[0] ?? null;

  if (!connection) {
    return NextResponse.json({ error: "No approved connection" }, { status: 403 });
  }

  // Open-ended access: check if producer has granted data access
  if (!connection.permission_granted_at) {
    return NextResponse.json({ error: "Data access not granted" }, { status: 403 });
  }

  const permissions = parseSharingPermissions(connection.sharing_permissions);

  // Use service role to read client's data (bypasses RLS)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "Service role key not configured" },
      { status: 500 }
    );
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );

  // Fetch client's herds only if sharing is enabled
  let herds: unknown[] = [];
  if (permissions.herds) {
    const { data, error: herdsError } = await serviceClient
      .from("herds")
      .select("*")
      .eq("user_id", clientUserId)
      .eq("is_deleted", false)
      .neq("is_demo_data", true)
      .order("name");

    if (herdsError) {
      console.error("Advisor client-herds fetch error:", herdsError.message);
      return NextResponse.json({ error: "Failed to fetch client data" }, { status: 500 });
    }
    herds = data ?? [];
  }

  // Fetch client's real properties only (exclude deleted and demo/simulated)
  let properties: unknown[] = [];
  if (permissions.properties) {
    const { data } = await serviceClient
      .from("properties")
      .select("id, property_name, state, region, default_saleyard")
      .eq("user_id", clientUserId)
      .eq("is_deleted", false)
      .eq("is_simulated", false);
    properties = data ?? [];
  }

  // Client profile is always fetched (basic identification, not portfolio data)
  const { data: clientProfile } = await serviceClient
    .from("user_profiles")
    .select("display_name, company_name, property_name, state, region")
    .eq("user_id", clientUserId)
    .single();

  return NextResponse.json({
    herds,
    properties,
    clientProfile: clientProfile ?? null,
    connection: {
      id: connection.id,
      permission_expires_at: connection.permission_expires_at,
    },
    permissions,
  });
}
