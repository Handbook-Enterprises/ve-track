import {
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from "date-fns";

export interface DateRange {
  from: number;
  to: number;
  label: string;
}

export type RangePresetId = string;

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

const lastDays = (n: number, label: string): RangePreset => ({
  id: `last_${n}`,
  label,
  build: () =>
    range(startOfDay(subDays(new Date(), n - 1)), endOfDay(new Date()), label),
});

const yearPreset = (offset: number): RangePreset => {
  const year = new Date().getFullYear() - offset;
  return {
    id: `year_${year}`,
    label: String(year),
    build: () => {
      const anchor = subYears(new Date(), offset);
      const to = offset === 0 ? endOfDay(new Date()) : endOfYear(anchor);
      return range(startOfYear(anchor), to, String(year));
    },
  };
};

const monthPreset = (offset: number): RangePreset => {
  const anchor = subMonths(new Date(), offset);
  const label = format(anchor, "MMMM");
  return {
    id: `month_${offset}`,
    label,
    build: () => {
      const m = subMonths(new Date(), offset);
      const to = offset === 0 ? endOfDay(new Date()) : endOfMonth(m);
      return range(startOfMonth(m), to, format(m, "MMMM"));
    },
  };
};

export const RANGE_PRESETS: RangePreset[] = [
  lastDays(7, "Last 7 days"),
  lastDays(28, "Last 28 days"),
  lastDays(90, "Last 90 days"),
  lastDays(365, "Last 365 days"),
  {
    id: "lifetime",
    label: "Lifetime",
    build: () =>
      range(startOfDay(subYears(new Date(), 5)), endOfDay(new Date()), "Lifetime"),
  },
  yearPreset(0),
  yearPreset(1),
  monthPreset(0),
  monthPreset(1),
  monthPreset(2),
];

export const DEFAULT_PRESET_ID: RangePresetId = "last_28";

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
