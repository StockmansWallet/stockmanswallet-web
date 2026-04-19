export type AlertRow = {
  id: string;
  target_kind: "category" | "saleyard";
  target_name: string;
  state: string | null;
  comparator: "above" | "below";
  threshold_cents: number;
  is_active: boolean;
  triggered_at: string | null;
  last_observed_price_cents: number | null;
  note: string | null;
  created_at: string;
};

export type SaleyardOption = {
  name: string;
  state: string | null;
};

export type OptionItem = { value: string; label: string };
