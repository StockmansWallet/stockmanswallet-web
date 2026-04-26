"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Stethoscope, Pencil, Trash2, X, Syringe, Droplets, Bug, Cross } from "lucide-react";
import {
  createHealthRecord,
  updateHealthRecord,
  deleteHealthRecord,
} from "@/app/(app)/dashboard/herds/record-actions";
import {
  RecordPhotoUploader,
  type RecordPhoto,
} from "./record-photo-uploader";
import { RecordPhotoStrip } from "./record-photo-strip";

type TreatmentType = "Vaccination" | "Drenching" | "Parasite Treatment" | "Other";

interface HealthRecord {
  id: string;
  date: string;
  treatment_type: TreatmentType;
  notes: string | null;
  photos: RecordPhoto[];
}

const TREATMENT_OPTIONS = [
  { value: "Vaccination", label: "Vaccination" },
  { value: "Drenching", label: "Drenching" },
  { value: "Parasite Treatment", label: "Parasite Treatment" },
  { value: "Other", label: "Other" },
];

const treatmentIcons: Record<TreatmentType, React.ComponentType<{ className?: string }>> = {
  "Vaccination": Syringe,
  "Drenching": Droplets,
  "Parasite Treatment": Bug,
  "Other": Cross,
};

function SectionIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
      <Icon className="h-3.5 w-3.5 text-brand" />
    </div>
  );
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function HealthForm({
  herdId,
  userId,
  record,
  onClose,
}: {
  herdId: string;
  userId: string;
  record?: HealthRecord;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recordId = useMemo(() => record?.id ?? crypto.randomUUID(), [record?.id]);
  const [photoPaths, setPhotoPaths] = useState<string[]>(
    () => record?.photos.map((p) => p.path) ?? [],
  );
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const data = {
      date: (fd.get("date") as string) || today,
      treatment_type: (fd.get("treatment_type") as TreatmentType) || "Other",
      notes: (fd.get("notes") as string) || null,
      photo_paths: photoPaths,
    };
    const result = record
      ? await updateHealthRecord(record.id, herdId, data)
      : await createHealthRecord(herdId, { id: recordId, ...data });
    if ("error" in result && result.error) {
      setError(result.error);
      setSaving(false);
    } else {
      onClose();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl bg-white/[0.03] p-4 ring-1 ring-inset ring-white/[0.06]">
      {error && <p className="text-xs text-error">{error}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input id="hr-date" name="date" label="Date" type="date" defaultValue={record?.date ?? today} required />
        <Select
          id="hr-type"
          name="treatment_type"
          label="Treatment Type"
          options={TREATMENT_OPTIONS}
          defaultValue={record?.treatment_type ?? "Vaccination"}
        />
      </div>
      <textarea
        name="notes"
        rows={2}
        defaultValue={record?.notes ?? ""}
        placeholder="Treatment details..."
        className="w-full rounded-xl bg-white/5 px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none ring-1 ring-inset ring-white/10 focus:ring-brand/60"
      />
      <RecordPhotoUploader
        userId={userId}
        recordId={recordId}
        kind="health"
        initialPhotos={record?.photos ?? []}
        onChange={setPhotoPaths}
      />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving..." : record ? "Update" : "Add Record"}</Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="border border-white/[0.08] bg-white/[0.04] text-xs hover:bg-white/[0.06]"
          onClick={onClose}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function HealthRecordsSection({
  herdId,
  userId,
  records: initialRecords,
  editable = false,
}: {
  herdId: string;
  userId: string;
  records: HealthRecord[];
  editable?: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const records = initialRecords;

  async function handleDelete(id: string) {
    setDeleting(id);
    await deleteHealthRecord(id, herdId);
    setDeleting(null);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <SectionIcon icon={Stethoscope} />
            <CardTitle>Health Records</CardTitle>
          </div>
          {editable && !showForm && (
            <Button size="sm" variant="secondary" onClick={() => { setShowForm(true); setEditingId(null); }}>
              Add
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {showForm && !editingId && (
          <div className="mb-4">
            <HealthForm herdId={herdId} userId={userId} onClose={() => setShowForm(false)} />
          </div>
        )}
        {records.length === 0 && !showForm ? (
          <p className="text-sm text-text-muted">No health records yet.</p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {records.map((r) => {
              const TIcon = treatmentIcons[r.treatment_type] ?? Cross;
              return (
                <div key={r.id}>
                  {editingId === r.id ? (
                    <div className="py-3">
                      <HealthForm herdId={herdId} userId={userId} record={r} onClose={() => setEditingId(null)} />
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3 py-3">
                      <div className="flex min-w-0 flex-1 items-start gap-2.5">
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/5">
                          <TIcon className="h-3.5 w-3.5 text-text-muted" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary">{formatDate(r.date)}</p>
                          <p className="mt-0.5 text-xs text-text-muted">{r.treatment_type}</p>
                          {r.notes && <p className="mt-0.5 text-xs text-text-muted">{r.notes}</p>}
                          <RecordPhotoStrip photos={r.photos} />
                        </div>
                      </div>
                      {editable && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button onClick={() => setEditingId(r.id)} className="rounded-lg p-1.5 text-text-muted hover:bg-white/5 hover:text-text-primary">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            disabled={deleting === r.id}
                            className="rounded-lg p-1.5 text-text-muted hover:bg-error/10 hover:text-error"
                          >
                            {deleting === r.id ? <X className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
