"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, Info, Scale, MapPin } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  getLocalHerd,
  removeLocalHerd,
  DEMO_OVERLAY_CHANGE_EVENT,
  type DemoLocalHerd,
} from "@/lib/demo-overlay";

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-center justify-between py-3 text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="text-text-primary font-medium tabular-nums">{String(value)}</span>
    </div>
  );
}

function SectionIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="bg-brand/15 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
      <Icon className="text-brand h-3.5 w-3.5" />
    </div>
  );
}

export function LocalHerdDetail({ id }: { id: string }) {
  const router = useRouter();
  const [herd, setHerd] = useState<DemoLocalHerd | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const sync = () => {
      setHerd(getLocalHerd(id));
      setLoaded(true);
    };
    sync();
    window.addEventListener(DEMO_OVERLAY_CHANGE_EVENT, sync);
    return () => window.removeEventListener(DEMO_OVERLAY_CHANGE_EVENT, sync);
  }, [id]);

  if (!loaded) {
    return <div className="text-text-muted py-12 text-center text-sm">Loading...</div>;
  }

  if (!herd) {
    return (
      <div>
        <Link
          href="/dashboard/herds"
          className="text-text-muted hover:text-text-primary inline-flex items-center gap-1.5 text-sm"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Herds
        </Link>
        <Card className="mt-4">
          <CardContent className="py-10 text-center">
            <p className="text-text-secondary text-sm">
              This local herd no longer exists. It may have been deleted or the overlay was cleared.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleDelete() {
    if (!herd) return;
    setDeleting(true);
    removeLocalHerd(herd.id);
    router.push("/dashboard/herds");
    router.refresh();
  }

  const mortalityPct = herd.mortality_rate > 1 ? herd.mortality_rate : herd.mortality_rate * 100;
  const calvingPct = herd.calving_rate > 1 ? herd.calving_rate : herd.calving_rate * 100;

  return (
    <div className="max-w-3xl">
      <Link
        href="/dashboard/herds"
        className="bg-surface-lowest text-text-muted hover:text-text-primary mb-3 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Herds
      </Link>

      <PageHeader title={herd.name} titleClassName="text-4xl font-bold text-brand" />
      <div className="mt-1 mb-4 flex flex-wrap items-center gap-2">
        <Badge variant="default">{herd.category}</Badge>
        {herd.sub_category && herd.sub_category !== herd.category && (
          <Badge variant="default">{herd.sub_category}</Badge>
        )}
        <Badge variant="brand">Local (demo)</Badge>
      </div>

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center gap-3">
          <SectionIcon icon={Info} />
          <CardTitle className="text-base">Overview</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-white/[0.06]">
          <Row label="Species" value={herd.species} />
          <Row label="Breed" value={herd.breed} />
          <Row label="Sex" value={herd.sex} />
          <Row label="Head" value={herd.head_count.toLocaleString()} />
          <Row label="Age (months)" value={herd.age_months ?? undefined} />
          <Row label="Livestock Owner" value={herd.livestock_owner ?? undefined} />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center gap-3">
          <SectionIcon icon={Scale} />
          <CardTitle className="text-base">Weight &amp; Growth</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-white/[0.06]">
          <Row label="Initial Weight" value={`${herd.initial_weight} kg`} />
          <Row label="Current Weight" value={`${herd.current_weight} kg`} />
          <Row label="Daily Weight Gain" value={`${herd.daily_weight_gain} kg/day`} />
          <Row label="Mortality Rate" value={`${mortalityPct.toFixed(1)}%`} />
          {herd.is_breeder && <Row label="Calving Rate" value={`${calvingPct.toFixed(0)}%`} />}
        </CardContent>
      </Card>

      {(herd.paddock_name || herd.selected_saleyard) && (
        <Card className="mt-4">
          <CardHeader className="flex flex-row items-center gap-3">
            <SectionIcon icon={MapPin} />
            <CardTitle className="text-base">Location</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-white/[0.06]">
            <Row label="Paddock" value={herd.paddock_name ?? undefined} />
            <Row label="Preferred Saleyard" value={herd.selected_saleyard ?? undefined} />
          </CardContent>
        </Card>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Link
          href={`/dashboard/herds/${herd.id}/edit`}
          className="bg-surface hover:bg-surface-raised text-text-secondary hover:text-text-primary inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-colors"
        >
          Edit
        </Link>
        <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
          Delete
        </Button>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete Local Herd"
        size="sm"
      >
        <p className="text-text-secondary mb-6 text-sm">
          Are you sure you want to delete <strong>{herd.name}</strong>? Local herds live only in
          your browser and cannot be recovered after deletion.
        </p>
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            className="border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.06]"
            onClick={() => setConfirmOpen(false)}
          >
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete Herd"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
