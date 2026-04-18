// Shared Zod schemas and helpers for herd form parsing.
// Consumers: app/(app)/dashboard/herds/actions.ts (producer),
// app/(app)/dashboard/advisor/simulator/actions.ts (simulator).
//
// `baseHerdFormSchema` covers every field the simulator needs. The producer
// path uses `fullHerdFormSchema` which extends the base with fields that only
// exist on real herds (is_pregnant, notes, livestock_owner, etc.).

import { z } from "zod";

// Empty strings coming out of <input> elements should be treated as null.
export const emptyToNull = z.string().transform((v) => (v === "" ? null : v));
export const optionalString = emptyToNull.nullable().optional();
export const optionalEnum = <T extends [string, ...string[]]>(values: T) =>
  emptyToNull
    .nullable()
    .optional()
    .pipe(z.enum(values).nullable().optional());

export const baseHerdFormSchema = z.object({
  name: z.string().min(1),
  species: z.enum(["Cattle", "Sheep", "Pig", "Goat"]),
  breed: z.string().min(1),
  category: z.string().min(1),
  age_months: z.coerce.number().int().min(0).default(0),
  head_count: z.coerce.number().int().min(1).default(1),
  initial_weight: z.coerce.number().min(0).default(0),
  current_weight: z.coerce.number().min(0).optional(),
  daily_weight_gain: z.coerce.number().min(0).default(0),
  mortality_rate: z.coerce.number().min(0).max(100).default(0),
  is_breeder: z.string().optional(),
  calving_rate: z.coerce.number().min(0).max(100).optional(),
  breeding_program_type: optionalEnum(["ai", "controlled", "uncontrolled"]),
  joining_period_start: optionalString,
  joining_period_end: optionalString,
  selected_saleyard: optionalString,
  paddock_name: optionalString,
  property_id: emptyToNull
    .nullable()
    .optional()
    .pipe(z.string().uuid().nullable().optional()),
  additional_info: optionalString,
  breed_premium_override: optionalString,
  sub_category: optionalString,
  breeder_sub_type: optionalString,
  calf_weight_recorded_date: optionalString,
});

// Fields that only exist on real producer herds. The simulator operates on
// simulated herds and intentionally does not track these.
export const fullHerdFormSchema = baseHerdFormSchema.extend({
  is_pregnant: z.string().optional(),
  joined_date: optionalString,
  notes: optionalString,
  animal_id_number: optionalString,
  breed_premium_justification: optionalString,
  lactation_status: optionalString,
  livestock_owner: optionalString,
});

export type BaseHerdFormInput = z.infer<typeof baseHerdFormSchema>;
export type FullHerdFormInput = z.infer<typeof fullHerdFormSchema>;

// Master-category to sex derivation, shared by producer and simulator create
// paths. Legacy fallback keeps historical non-master categories working.
export function deriveSexFromCategory(category: string): "Male" | "Female" {
  if (category === "Steer" || category === "Bull") return "Male";
  if (
    category === "Heifer" ||
    category === "Breeder" ||
    category === "Dry Cow"
  ) {
    return "Female";
  }
  const MALE_KEYWORDS = ["Bull", "Steer", "Barrow", "Buck", "Wether"];
  return MALE_KEYWORDS.some((k) => category.includes(k)) ? "Male" : "Female";
}
