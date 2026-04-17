import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { parseSharingPermissions } from "@/lib/types/advisory";
import { z } from "zod";

/**
 * POST /api/advisor/client-herds
 * Fetches a client's herds for an authorized advisor. Uses service role to
 * bypass RLS. Every field returned is gated on the matching sharing_permissions
 * flag, and on the connection being approved + unexpired. Read-only.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = z.string().uuid().safeParse(body?.clientUserId);

  if (!parsed.success) {
    return NextResponse.json({ error: "Valid clientUserId required" }, { status: 400 });
  }

  const clientUserId = parsed.data;

  // Verify active approved connection in either direction (advisor or farmer initiated).
  const { data: connectionRows } = await supabase
    .from("connection_requests")
    .select("id, requester_user_id, target_user_id, status, permission_granted_at, permission_expires_at, sharing_permissions")
    .or(`and(requester_user_id.eq.${user.id},target_user_id.eq.${clientUserId}),and(requester_user_id.eq.${clientUserId},target_user_id.eq.${user.id})`)
    .eq("status", "approved")
    .limit(1);

  const connection = connectionRows?.[0] ?? null;

  if (!connection || !connection.permission_granted_at) {
    return NextResponse.json({ error: "Data access not granted" }, { status: 403 });
  }

  if (connection.permission_expires_at
      && new Date(connection.permission_expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: "Data access has expired" }, { status: 403 });
  }

  const permissions = parseSharingPermissions(connection.sharing_permissions);
  const anyShared = permissions.herds || permissions.properties || permissions.valuations;
  if (!anyShared) {
    return NextResponse.json({ error: "Producer has disabled all data sharing" }, { status: 403 });
  }

  const serviceClient = createServiceRoleClient();

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

  // Client profile is gated on properties permission since it includes
  // property_name, state, region. display_name + company_name are safe-ish
  // identifiers but still require an active connection, which we've verified.
  const { data: profileRow } = await serviceClient
    .from("user_profiles")
    .select("display_name, company_name, property_name, state, region")
    .eq("user_id", clientUserId)
    .single();

  const clientProfile = profileRow
    ? {
        display_name: profileRow.display_name,
        company_name: profileRow.company_name,
        property_name: permissions.properties ? profileRow.property_name : null,
        state: permissions.properties ? profileRow.state : null,
        region: permissions.properties ? profileRow.region : null,
      }
    : null;

  return NextResponse.json({
    herds,
    properties,
    clientProfile,
    connection: {
      id: connection.id,
      permission_expires_at: connection.permission_expires_at,
    },
    permissions,
  });
}
