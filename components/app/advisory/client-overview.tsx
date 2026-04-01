"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function ClientOverview({ connection, baselineValue = 0 }: ClientOverviewProps) {
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
          body: JSON.stringify({ clientUserId: connection.target_user_id }),
        });

        if (!res.ok) {
          const body = await res.json();
          setError(body.error || "Failed to load client data");
          return;
        }

        const clientData = await res.json();
        // Ensure permissions are parsed from the API response
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
      <PermissionBanner
        connection={connection}
        isActive={isActive}
        permissions={data?.permissions}
      />

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
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="mb-2 h-8 w-16" />
                  <Skeleton className="h-3 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
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

function LockedSection({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="py-6 text-center">
        <Lock className="mx-auto mb-2 h-5 w-5 text-text-muted" />
        <p className="text-xs text-text-muted">{label} not shared</p>
      </CardContent>
    </Card>
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
      {/* Portfolio value */}
      {permissions.valuations && baselineValue > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-muted">Portfolio Value</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-brand">
              ${Math.round(baselineValue).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        {permissions.herds && (
          <>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-text-primary">
                  {totalHead.toLocaleString()}
                </p>
                <p className="text-xs text-text-muted">Total Head</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-text-primary">{activeHerds.length}</p>
                <p className="text-xs text-text-muted">Active Herds</p>
              </CardContent>
            </Card>
          </>
        )}
        {permissions.properties && (
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-text-primary">{data.properties.length}</p>
              <p className="text-xs text-text-muted">Properties</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Properties section */}
      {permissions.properties ? (
        data.properties.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Properties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.properties.map((property) => (
                  <div
                    key={property.id}
                    className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2"
                  >
                    <MapPin className="h-4 w-4 text-text-muted" />
                    <span className="text-sm text-text-primary">{property.property_name}</span>
                    {property.state && (
                      <span className="text-xs text-text-muted">
                        {property.state}
                        {property.region ? `, ${property.region}` : ""}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <LockedSection label="Property data" />
      )}

      {/* Herd Composition */}
      {permissions.herds && Object.keys(speciesGroups).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Herd Composition</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(speciesGroups).map(([species, info]) => (
                <div
                  key={species}
                  className="flex items-center justify-between rounded-lg bg-surface px-3 py-2"
                >
                  <span className="text-sm font-medium text-text-primary">{species}</span>
                  <div className="flex items-center gap-3">
                    <Badge variant="default">{info.count} herds</Badge>
                    <span className="text-sm font-semibold text-text-primary">
                      {info.head.toLocaleString()} head
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
