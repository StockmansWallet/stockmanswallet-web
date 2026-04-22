"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Wrench, DollarSign, Home, User } from "lucide-react";
import { IconCattleTags } from "@/components/icons/icon-cattle-tags";
import type { Database } from "@/lib/types/database";
import type { YardBookCategory, RecurrenceRule } from "@/lib/types/models";

type YardBookRow = Database["public"]["Tables"]["yard_book_items"]["Row"];
type IconComponent = React.ComponentType<{ className?: string }>;

const CATEGORIES: {
  value: YardBookCategory;
  label: string;
  icon: IconComponent;
  bg: string;
  text: string;
}[] = [
  {
    value: "Livestock",
    label: "Livestock",
    icon: IconCattleTags,
    bg: "bg-yard-book/15",
    text: "text-yard-book-light",
  },
  {
    value: "Operations",
    label: "Operations",
    icon: Wrench,
    bg: "bg-warning/15",
    text: "text-warning",
  },
  { value: "Finance", label: "Finance", icon: DollarSign, bg: "bg-info/15", text: "text-info" },
  { value: "Family", label: "Family", icon: Home, bg: "bg-violet/15", text: "text-violet" },
  { value: "Me", label: "Me", icon: User, bg: "bg-success/15", text: "text-success" },
];

const REMINDER_OPTIONS = [
  { value: 0, label: "On the day" },
  { value: 1, label: "1 day before" },
  { value: 3, label: "3 days before" },
  { value: 7, label: "1 week before" },
  { value: 14, label: "2 weeks before" },
  { value: 21, label: "3 weeks before" },
];

const RECURRENCE_OPTIONS: { value: RecurrenceRule; label: string }[] = [
  { value: "Weekly", label: "Weekly" },
  { value: "Fortnightly", label: "Fortnightly" },
  { value: "Monthly", label: "Monthly" },
  { value: "Annual", label: "Annual" },
];

interface YardBookFormProps {
  item?: YardBookRow;
  herds: { id: string; name: string; head_count: number }[];
  properties: { id: string; property_name: string }[];
  action: (formData: FormData) => Promise<{ error: string } | void>;
  submitLabel: string;
}

export function YardBookForm({ item, herds, properties, action, submitLabel }: YardBookFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [category, setCategory] = useState<YardBookCategory>(item?.category_raw ?? "Livestock");
  const [isAllDay, setIsAllDay] = useState(item?.is_all_day ?? true);
  const [isRecurring, setIsRecurring] = useState(item?.is_recurring ?? false);
  const [enableReminders, setEnableReminders] = useState((item?.reminder_offsets?.length ?? 0) > 0);
  const [selectedOffsets, setSelectedOffsets] = useState<Set<number>>(
    new Set(item?.reminder_offsets ?? [])
  );
  const [selectedHerdIds, setSelectedHerdIds] = useState<Set<string>>(
    new Set(item?.linked_herd_ids ?? [])
  );

  function toggleOffset(offset: number) {
    setSelectedOffsets((prev) => {
      const next = new Set(prev);
      if (next.has(offset)) next.delete(offset);
      else next.add(offset);
      return next;
    });
  }

  function toggleHerd(herdId: string) {
    setSelectedHerdIds((prev) => {
      const next = new Set(prev);
      if (next.has(herdId)) next.delete(herdId);
      else next.add(herdId);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const result = await action(formData);

    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
    }
  }

  const propertyOptions = properties.map((p) => ({
    value: p.id,
    label: p.property_name,
  }));

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="border-error/40 bg-error/10 text-error mb-6 rounded-xl border px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Hidden fields for array data and category */}
      <input type="hidden" name="category" value={category} />
      <input
        type="hidden"
        name="reminder_offsets"
        value={
          enableReminders && selectedOffsets.size > 0 ? JSON.stringify([...selectedOffsets]) : ""
        }
      />
      <input
        type="hidden"
        name="linked_herd_ids"
        value={selectedHerdIds.size > 0 ? JSON.stringify([...selectedHerdIds]) : ""}
      />

      <div className="grid grid-cols-1 gap-x-8 gap-y-8 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-8">
          {/* Title */}
          <section>
            <h3 className="text-text-muted mb-4 text-xs font-semibold tracking-wider uppercase">
              Event Details
            </h3>
            <Input
              id="title"
              name="title"
              label="Title"
              required
              defaultValue={item?.title ?? ""}
              placeholder="e.g. Muster Springfield paddock, Drench weaners"
            />
          </section>

          {/* Date & Time */}
          <section>
            <h3 className="text-text-muted mb-4 text-xs font-semibold tracking-wider uppercase">
              Date & Time
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="event_date"
                name="event_date"
                label="Event Date"
                type="date"
                required
                defaultValue={item?.event_date?.split("T")[0] ?? ""}
              />
              <div>
                <label className="text-text-secondary mb-1.5 flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    name="is_all_day"
                    checked={isAllDay}
                    onChange={(e) => setIsAllDay(e.target.checked)}
                    className="text-yard-book accent-yard-book h-4 w-4 rounded border-black/20"
                  />
                  All day event
                </label>
                {!isAllDay && (
                  <Input
                    id="event_time"
                    name="event_time"
                    type="time"
                    defaultValue={item?.event_time ?? ""}
                    className="mt-2"
                  />
                )}
              </div>
            </div>
          </section>

          {/* Category */}
          <section>
            <h3 className="text-text-muted mb-4 text-xs font-semibold tracking-wider uppercase">
              Category
            </h3>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                      isActive
                        ? `${cat.bg} ${cat.text}`
                        : "text-text-muted hover:text-text-secondary bg-white/5 hover:bg-white/8"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Notes */}
          <section>
            <h3 className="text-text-muted mb-4 text-xs font-semibold tracking-wider uppercase">
              Notes
            </h3>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={item?.notes ?? ""}
              placeholder="Any additional notes..."
              className="text-text-primary placeholder:text-text-muted focus:ring-yard-book/60 w-full rounded-xl bg-white/5 px-4 py-3 text-sm transition-all outline-none focus:bg-white/8 focus:ring-1 focus:ring-inset"
            />
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-8">
          {/* Reminders */}
          <section>
            <h3 className="text-text-muted mb-4 text-xs font-semibold tracking-wider uppercase">
              Reminders
            </h3>
            <label className="text-text-primary mb-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={enableReminders}
                onChange={(e) => setEnableReminders(e.target.checked)}
                className="text-yard-book accent-yard-book h-4 w-4 rounded border-black/20"
              />
              Enable reminders
            </label>
            {enableReminders && (
              <div className="flex flex-wrap gap-2">
                {REMINDER_OPTIONS.map((opt) => {
                  const isActive = selectedOffsets.has(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleOffset(opt.value)}
                      className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                        isActive
                          ? "bg-yard-book/15 text-yard-book"
                          : "text-text-muted hover:text-text-secondary bg-white/5 hover:bg-white/8"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Recurrence */}
          <section>
            <h3 className="text-text-muted mb-4 text-xs font-semibold tracking-wider uppercase">
              Recurrence
            </h3>
            <label className="text-text-primary mb-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_recurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="text-yard-book accent-yard-book h-4 w-4 rounded border-black/20"
              />
              Recurring event
            </label>
            {isRecurring && (
              <Select
                id="recurrence_rule"
                name="recurrence_rule"
                label="Repeat"
                options={RECURRENCE_OPTIONS}
                placeholder="Select frequency"
                defaultValue={item?.recurrence_rule_raw ?? ""}
              />
            )}
          </section>

          {/* Linked Herds */}
          {herds.length > 0 && (
            <section>
              <h3 className="text-text-muted mb-4 text-xs font-semibold tracking-wider uppercase">
                Link to Herds
              </h3>
              <div className="flex flex-wrap gap-2">
                {herds.map((herd) => {
                  const isActive = selectedHerdIds.has(herd.id);
                  return (
                    <button
                      key={herd.id}
                      type="button"
                      onClick={() => toggleHerd(herd.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                        isActive
                          ? "bg-yard-book/15 text-yard-book"
                          : "text-text-muted hover:text-text-secondary bg-white/5 hover:bg-white/8"
                      }`}
                    >
                      <IconCattleTags className="h-3 w-3" />
                      {herd.name}
                      <span className="opacity-60">{herd.head_count}hd</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Property */}
          {propertyOptions.length > 0 && (
            <section>
              <h3 className="text-text-muted mb-4 text-xs font-semibold tracking-wider uppercase">
                Property
              </h3>
              <Select
                id="property_id"
                name="property_id"
                options={propertyOptions}
                placeholder="Select property (optional)"
                defaultValue={item?.property_id ?? ""}
              />
            </section>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex items-center gap-3">
        <Button type="submit" variant="yard-book" disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.06]"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
