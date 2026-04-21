// Demo overlay: client-side local store for the shared demo account so visitors
// can add/remove their own herds without mutating shared Supabase state. RLS
// blocks writes for the demo user anyway; this layer gives them a sandbox that
// lives in localStorage until sign-out (see DemoModeProvider).
//
// Scope: additions only for now. Editing/deleting seeded demo herds is not
// supported; only local additions can be removed. The dashboard chart and
// advisor features still reflect the seeded Supabase data exclusively.

export const DEMO_OVERLAY_STORAGE_KEY = "sw:demo-overlay:v1";
export const DEMO_OVERLAY_CHANGE_EVENT = "sw-demo-overlay-change";
export const DEMO_LOCAL_ID_PREFIX = "local-";
// Shared demo account uid - stable across environments via seed_demo_user_extras.sql.
export const DEMO_USER_ID = "f8c88530-a6ac-41a3-a6ce-7cac3369ec0d";

// Shape matches the subset of public.herds columns consumed by herds list,
// detail, and the client-side valuation engine. Fields the engine reads must
// be populated; everything else is optional.
export type DemoLocalHerd = {
  id: string;
  user_id: string;
  name: string;
  species: string;
  breed: string;
  category: string;
  sub_category: string | null;
  sex: string;
  age_months: number | null;
  head_count: number;
  initial_weight: number;
  current_weight: number;
  daily_weight_gain: number;
  mortality_rate: number;
  paddock_name: string | null;
  selected_saleyard: string | null;
  property_id: string | null;
  additional_info: string | null;
  is_breeder: boolean;
  is_pregnant: boolean;
  is_sold: boolean;
  is_deleted: boolean;
  breed_premium_override: number | null;
  breeder_sub_type: string | null;
  livestock_owner: string | null;
  notes: string | null;
  calving_rate: number;
  breeding_program_type: string | null;
  joining_period_start: string | null;
  joining_period_end: string | null;
  joined_date: string | null;
  lactation_status: string | null;
  calf_weight_recorded_date: string | null;
  breed_premium_justification: string | null;
  animal_id_number: string | null;
  previous_dwg: number | null;
  dwg_change_date: string | null;
  is_demo_data: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  __local: true;
};

export type DemoOverlay = {
  version: 1;
  herds: DemoLocalHerd[];
};

export function emptyOverlay(): DemoOverlay {
  return { version: 1, herds: [] };
}

export function readOverlay(): DemoOverlay {
  if (typeof window === "undefined") return emptyOverlay();
  try {
    const raw = window.localStorage.getItem(DEMO_OVERLAY_STORAGE_KEY);
    if (!raw) return emptyOverlay();
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return emptyOverlay();
    const o = parsed as Partial<DemoOverlay>;
    if (o.version !== 1 || !Array.isArray(o.herds)) return emptyOverlay();
    return { version: 1, herds: o.herds as DemoLocalHerd[] };
  } catch {
    return emptyOverlay();
  }
}

function writeOverlay(next: DemoOverlay): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEMO_OVERLAY_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(DEMO_OVERLAY_CHANGE_EVENT));
}

export function clearOverlay(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DEMO_OVERLAY_STORAGE_KEY);
  window.dispatchEvent(new Event(DEMO_OVERLAY_CHANGE_EVENT));
}

export function isLocalHerdId(id: string): boolean {
  return id.startsWith(DEMO_LOCAL_ID_PREFIX);
}

export function newLocalHerdId(): string {
  return DEMO_LOCAL_ID_PREFIX + (crypto.randomUUID?.() ?? String(Date.now()));
}

export function addLocalHerd(herd: Omit<DemoLocalHerd, "__local">): DemoLocalHerd {
  const overlay = readOverlay();
  const stamped: DemoLocalHerd = { ...herd, __local: true };
  writeOverlay({ version: 1, herds: [...overlay.herds, stamped] });
  return stamped;
}

export function removeLocalHerd(id: string): void {
  const overlay = readOverlay();
  writeOverlay({ version: 1, herds: overlay.herds.filter((h) => h.id !== id) });
}

export function getLocalHerd(id: string): DemoLocalHerd | null {
  return readOverlay().herds.find((h) => h.id === id) ?? null;
}

export function updateLocalHerd(id: string, patch: Partial<DemoLocalHerd>): DemoLocalHerd | null {
  const overlay = readOverlay();
  let next: DemoLocalHerd | null = null;
  const herds = overlay.herds.map((h) => {
    if (h.id !== id) return h;
    next = { ...h, ...patch, __local: true, updated_at: new Date().toISOString() };
    return next;
  });
  writeOverlay({ version: 1, herds });
  return next;
}
