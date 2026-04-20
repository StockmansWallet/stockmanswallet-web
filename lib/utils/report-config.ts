// Parse report configuration from URL searchParams  -  shared by server components

const DATE_PRESETS = [
  { value: "1d", days: 1 },
  { value: "1w", days: 7 },
  { value: "1m", days: 30 },
  { value: "3m", days: 90 },
  { value: "6m", days: 180 },
  { value: "1y", days: 365 },
] as const;

function getPresetDates(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

export function parseReportConfig(searchParams: { [key: string]: string | string[] | undefined }): {
  startDate: string;
  endDate: string;
  selectedPropertyIds: string[];
} {
  const range = (searchParams.range as string) ?? "1y";
  const preset = DATE_PRESETS.find((p) => p.value === range);
  const defaultDates = getPresetDates(preset?.days ?? 365);

  return {
    startDate: (searchParams.start as string) ?? defaultDates.start,
    endDate: (searchParams.end as string) ?? defaultDates.end,
    selectedPropertyIds: ((searchParams.properties as string) ?? "").split(",").filter(Boolean),
  };
}
