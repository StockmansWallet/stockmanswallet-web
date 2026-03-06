"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Plus, Pencil, Trash2, X } from "lucide-react";
import {
  createMusterRecord,
  updateMusterRecord,
  deleteMusterRecord,
} from "@/app/(app)/dashboard/herds/record-actions";

interface MusterRecord {
  id: string;
  date: string;
  total_head_count: number | null;
  cattle_yard: string | null;
  weaners_count: number | null;
  branders_count: number | null;
  notes: string | null;
}

function SectionIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
      <Icon className="h-3.5 w-3.5 text-brand" />
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function MusterForm({
  herdId,
  record,
  onClose,
}: {
  herdId: string;
  record?: MusterRecord;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().split("T")[0];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const data = {
      date: (fd.get("date") as string) || today,
      total_head_count: Number(fd.get("total_head_count")) || null,
      cattle_yard: (fd.get("cattle_yard") as string) || null,
      weaners_count: Number(fd.get("weaners_count")) || null,
      branders_count: Number(fd.get("branders_count")) || null,
      notes: (fd.get("notes") as string) || null,
    };
    const result = record
      ? await updateMusterRecord(record.id, herdId, data)
      : await createMusterRecord(herdId, data);
    if ("error" in result && result.error) {
      setError(result.error);
      setSaving(false);
    } else {
      onClose();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl bg-white/[0.03] p-4 ring-1 ring-inset ring-white/[0.06]">
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input id="mr-date" name="date" label="Date" type="date" defaultValue={record?.date ?? today} required />
        <Input id="mr-head" name="total_head_count" label="Head Count" type="number" min={0} defaultValue={record?.total_head_count ?? ""} />
        <Input id="mr-yard" name="cattle_yard" label="Cattle Yard" defaultValue={record?.cattle_yard ?? ""} placeholder="e.g. Main Yards" />
        <Input id="mr-weaners" name="weaners_count" label="Weaners" type="number" min={0} defaultValue={record?.weaners_count ?? ""} />
        <Input id="mr-branders" name="branders_count" label="Branders" type="number" min={0} defaultValue={record?.branders_count ?? ""} />
      </div>
      <textarea
        name="notes"
        rows={2}
        defaultValue={record?.notes ?? ""}
        placeholder="Notes..."
        className="w-full rounded-xl bg-white/5 px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none ring-1 ring-inset ring-white/10 focus:ring-brand/60"
      />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving..." : record ? "Update" : "Add Record"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
}

export function MusterRecordsSection({
  herdId,
  records: initialRecords,
  editable = false,
}: {
  herdId: string;
  records: MusterRecord[];
  editable?: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const records = initialRecords;

  async function handleDelete(id: string) {
    setDeleting(id);
    await deleteMusterRecord(id, herdId);
    setDeleting(null);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <SectionIcon icon={Users} />
            <CardTitle>Mustering Records</CardTitle>
          </div>
          {editable && !showForm && (
            <Button size="sm" variant="secondary" onClick={() => { setShowForm(true); setEditingId(null); }}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {showForm && !editingId && (
          <div className="mb-4">
            <MusterForm herdId={herdId} onClose={() => setShowForm(false)} />
          </div>
        )}
        {records.length === 0 && !showForm ? (
          <p className="text-sm text-text-muted">No mustering records yet.</p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {records.map((r) => (
              <div key={r.id}>
                {editingId === r.id ? (
                  <div className="py-3">
                    <MusterForm herdId={herdId} record={r} onClose={() => setEditingId(null)} />
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary">{formatDate(r.date)}</p>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-text-muted">
                        {r.total_head_count != null && <span>{r.total_head_count} head</span>}
                        {r.weaners_count != null && r.weaners_count > 0 && <span>{r.weaners_count} weaners</span>}
                        {r.branders_count != null && r.branders_count > 0 && <span>{r.branders_count} branders</span>}
                        {r.cattle_yard && <span>{r.cattle_yard}</span>}
                      </div>
                      {r.notes && <p className="mt-1 text-xs text-text-muted">{r.notes}</p>}
                    </div>
                    {editable && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button onClick={() => setEditingId(r.id)} className="rounded-lg p-1.5 text-text-muted hover:bg-white/5 hover:text-text-primary">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          disabled={deleting === r.id}
                          className="rounded-lg p-1.5 text-text-muted hover:bg-red-500/10 hover:text-red-400"
                        >
                          {deleting === r.id ? <X className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
