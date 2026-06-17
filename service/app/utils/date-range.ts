import {
  endOfDay,
  format,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
} from "date-fns";

export interface DateRange {
  from: number;
  to: number;
  label: string;
}

export type RangePresetId =
  | "this_month"
  | "last_7"
  | "last_30"
  | "last_90"
  | "this_year";

export interface RangePreset {
  id: RangePresetId;
  label: string;
  build: () => DateRange;
}

const range = (from: Date, to: Date, label: string): DateRange => ({
  from: from.getTime(),
  to: to.getTime(),
  label,
});

export const RANGE_PRESETS: RangePreset[] = [
  {
    id: "this_month",
    label: "This month",
    build: () => range(startOfMonth(new Date()), endOfDay(new Date()), "This month"),
  },
  {
    id: "last_7",
    label: "Last 7 days",
    build: () =>
      range(startOfDay(subDays(new Date(), 6)), endOfDay(new Date()), "Last 7 days"),
  },
  {
    id: "last_30",
    label: "Last 30 days",
    build: () =>
      range(startOfDay(subDays(new Date(), 29)), endOfDay(new Date()), "Last 30 days"),
  },
  {
    id: "last_90",
    label: "Last 90 days",
    build: () =>
      range(startOfDay(subDays(new Date(), 89)), endOfDay(new Date()), "Last 90 days"),
  },
  {
    id: "this_year",
    label: "This year",
    build: () => range(startOfYear(new Date()), endOfDay(new Date()), "This year"),
  },
];

export const DEFAULT_PRESET_ID: RangePresetId = "this_month";

export const buildPreset = (id: RangePresetId): DateRange => {
  const preset = RANGE_PRESETS.find((p) => p.id === id) ?? RANGE_PRESETS[0];
  return preset.build();
};

export const buildCustomRange = (from: Date, to: Date): DateRange => {
  const f = startOfDay(from);
  const t = endOfDay(to);
  const sameYear = f.getFullYear() === t.getFullYear();
  const label = `${format(f, "MMM d")} to ${format(t, sameYear ? "MMM d" : "MMM d, yyyy")}`;
  return range(f, t, label);
};

export const rangeSpanDays = (from: number, to: number): number =>
  Math.max(1, Math.round((to - from) / 86_400_000));
