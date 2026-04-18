// Unit-explicit aliases for monetary amounts coming in and out of Supabase.
// `category_prices.final_price_per_kg` is stored in CENTS/kg. Most downstream
// code (CategoryPriceEntry, valuation engine) operates in DOLLARS/kg. Passing
// a `Cents` value into a site that expects `Dollars` has silently been
// handled by scattered `/ 100` divisions; using `centsToDollars()` and the
// `Cents` / `Dollars` aliases makes the unit audit-visible.

export type Cents = number;
export type Dollars = number;

export function centsToDollars(c: Cents): Dollars {
  return c / 100;
}

export function dollarsToCents(d: Dollars): Cents {
  return d * 100;
}
