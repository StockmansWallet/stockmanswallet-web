// Parse report configuration from URL searchParams  -  shared by server components

const DATE_PRESETS = [
  { value: "1m", months: 1 },
  { value: "3m", months: 3 },
  { value: "6m", months: 6 },
  { value: "1y", months: 12 },
] as const;

function getPresetDates(months: number) {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - months);
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
  const defaultDates = getPresetDates(preset?.months ?? 12);

  return {
    startDate: (searchParams.start as string) ?? defaultDates.start,
    endDate: (searchParams.end as string) ?? defaultDates.end,
    selectedPropertyIds: ((searchParams.properties as string) ?? "").split(",").filter(Boolean),
  };
}
