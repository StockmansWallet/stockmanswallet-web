"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionBanner } from "@/components/app/advisory/permission-banner";
import {
  hasActivePermission,
  parseSharingPermissions,
  type ConnectionRequest,
  type SharingPermissions,
} from "@/lib/types/advisory";
import { Users, MapPin, Lock } from "lucide-react";

interface ClientOverviewProps {
  connection: ConnectionRequest;
  clientUserId: string;
  baselineValue?: number;
}

interface ClientData {
  herds: Array<{
    id: string;
    name: string;
    species: string;
    breed: string;
    category: string;
    sex: string;
    head_count: number;
    current_weight: number;
    selected_saleyard?: string;
    is_sold: boolean;
  }>;
  properties: Array<{
    id: string;
    property_name: string;
    state: string;
    region?: string;
  }>;
  clientProfile: {
    display_name: string;
    company_name?: string;
    property_name?: string;
    state?: string;
    region?: string;
  } | null;
  connection: {
    id: string;
    permission_expires_at: string;
  };
  permissions: SharingPermissions;
}

export function ClientOverview({ connection, clientUserId, baselineValue = 0 }: ClientOverviewProps) {
  const [data, setData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isActive = hasActivePermission(connection);

  useEffect(() => {
    if (!isActive) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        const res = await fetch("/api/advisor/client-herds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientUserId }),
        });

        if (!res.ok) {
          const body = await res.json();
          setError(body.error || "Failed to load client data");
          return;
        }

        const clientData = await res.json();
        clientData.permissions = parseSharingPermissions(clientData.permissions);
        setData(clientData);
      } catch {
        setError("Failed to connect to server");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [connection.target_user_id, isActive]);

  return (
    <div className="space-y-4">
      {/* Only show banner for non-active states (pending, locked) */}
      {!isActive && (
        <PermissionBanner
          connection={connection}
          isActive={isActive}
          permissions={data?.permissions}
        />
      )}

      {!isActive && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-text-muted" />
            <p className="text-sm font-medium text-text-secondary">Data Locked</p>
            <p className="mt-1 text-xs text-text-muted">
              Request a permission renewal to view this client's portfolio.
            </p>
          </CardContent>
        </Card>
      )}

      {isActive && loading && (
        <Card>
          <CardContent className="p-5">
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <Skeleton className="mb-2 h-8 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isActive && error && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {isActive && data && <ClientDataView data={data} baselineValue={baselineValue} />}
    </div>
  );
}

function ClientDataView({ data, baselineValue }: { data: ClientData; baselineValue: number }) {
  const permissions = data.permissions;
  const activeHerds = data.herds.filter((h) => !h.is_sold);
  const totalHead = activeHerds.reduce((sum, h) => sum + h.head_count, 0);

  const speciesGroups: Record<string, { count: number; head: number }> = {};
  for (const herd of activeHerds) {
    if (!speciesGroups[herd.species]) {
      speciesGroups[herd.species] = { count: 0, head: 0 };
    }
    speciesGroups[herd.species].count += 1;
    speciesGroups[herd.species].head += herd.head_count;
  }

  return (
    <>
      {/* Combined stats row */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 divide-x divide-white/[0.06] sm:grid-cols-4">
            {permissions.valuations && baselineValue > 0 && (
              <div className="p-4">
                <p className="text-xs text-text-muted">Portfolio Value</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-brand">
                  ${Math.round(baselineValue).toLocaleString()}
                </p>
              </div>
            )}
            {permissions.herds && (
              <>
                <div className="p-4">
                  <p className="text-xs text-text-muted">Total Head</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-text-primary">
                    {totalHead.toLocaleString()}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-text-muted">Active Herds</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-text-primary">
                    {activeHerds.length}
                  </p>
                </div>
              </>
            )}
            {permissions.properties && (
              <div className="p-4">
                <p className="text-xs text-text-muted">Properties</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-text-primary">
                  {data.properties.length}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Properties + Herd Composition in a compact card */}
      {(permissions.properties || permissions.herds) && (
        <Card>
          <CardContent className="divide-y divide-white/[0.06] p-0">
            {/* Properties */}
            {permissions.properties && data.properties.length > 0 && (
              <div className="p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Properties</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {data.properties.map((property) => (
                    <span key={property.id} className="flex items-center gap-1.5 text-sm text-text-secondary">
                      <MapPin className="h-3 w-3 text-text-muted" />
                      {property.property_name}
                      {property.state && (
                        <span className="text-xs text-text-muted">{property.state}</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Herd Composition */}
            {permissions.herds && Object.keys(speciesGroups).length > 0 && (
              <div className="p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Herd Composition</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {Object.entries(speciesGroups).map(([species, info]) => (
                    <span key={species} className="flex items-center gap-2 text-sm text-text-secondary">
                      <span className="font-medium text-text-primary">{species}</span>
                      <Badge variant="default">{info.count} herds</Badge>
                      <span className="tabular-nums">{info.head.toLocaleString()} head</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Locked sections */}
            {!permissions.properties && (
              <div className="flex items-center gap-2 p-4">
                <Lock className="h-3.5 w-3.5 text-text-muted" />
                <span className="text-xs text-text-muted">Property data not shared</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
