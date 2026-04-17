// Shared plain-text formatter for Freight IQ estimates.
// Mirrors the iOS FreightShareFormatter so share output matches across platforms.

export interface FreightShareInput {
  originName: string;
  destinationName: string;
  herdName: string;
  headCount: number;
  averageWeightKg: number;
  distanceKm: number;
  totalCost: number;
  costPerHead: number;
  costPerDeck: number;
  decksRequired: number;
  assumptions: string;
}

function money(value: number): string {
  return `$${Math.round(value).toLocaleString("en-AU")}`;
}

export function buildFreightShareText(input: FreightShareInput): string {
  const origin = input.originName.trim() || "Origin";
  const destination = input.destinationName.trim() || "Destination";
  const route = `${origin} to ${destination}`;
  const herdLine = input.herdName.trim() ? `Herd: ${input.herdName}\n` : "";
  const weight = Math.round(input.averageWeightKg);
  const distance = Math.round(input.distanceKm);

  return [
    "Freight IQ Estimate",
    "",
    route,
    `${herdLine}${input.headCount} head · ${weight}kg avg · ${distance} km`,
    "",
    `Total: ${money(input.totalCost)} +GST`,
    `Per head: ${money(input.costPerHead)}`,
    `Per deck: ${money(input.costPerDeck)}`,
    `Decks: ${input.decksRequired}`,
    "",
    `Assumptions: ${input.assumptions}`,
    "",
    "Stockman's Wallet",
  ].join("\n");
}

export function buildAssumptionsSummary(params: {
  freightCategoryName: string;
  headsPerDeck: number;
  averageWeightKg: number;
  ratePerDeckPerKm: number;
  isCustomJob: boolean;
  capacitySourceIsUserOverride: boolean;
}): string {
  const weight = Math.round(params.averageWeightKg);
  const rate = params.ratePerDeckPerKm.toFixed(2);
  const parts: string[] = [];
  if (params.isCustomJob) {
    parts.push(`${weight}kg avg weight · ${params.headsPerDeck} head/deck`);
  } else {
    parts.push(`${params.freightCategoryName} · ${params.headsPerDeck} head/deck`);
    parts.push(`${weight}kg avg weight`);
  }
  parts.push(`$${rate}/deck/km`);
  if (params.capacitySourceIsUserOverride) {
    parts.push("Category overridden by user");
  }
  return parts.join(" • ");
}
