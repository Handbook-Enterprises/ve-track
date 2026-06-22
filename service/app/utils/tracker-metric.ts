import { formatMoney, formatNumber } from "./format";
import type { TrackerMetrics } from "~/types/tracker.types";

export const WINDOW_LABEL = "Last 28 days";

export type MetricKind =
  | "cumulative"
  | "balance"
  | "credits"
  | "requests"
  | "none";

export const metricKind = (m: TrackerMetrics): MetricKind =>
  m.monthly_spend != null
    ? "cumulative"
    : m.balance_usd != null
      ? "balance"
      : m.credits_remaining != null
        ? "credits"
        : m.request_count != null
          ? "requests"
          : "none";

export const isMoneyKind = (kind: MetricKind): boolean =>
  kind === "cumulative" || kind === "balance";

export const metricValueFor = (
  kind: MetricKind,
  m: TrackerMetrics,
): number | null => {
  switch (kind) {
    case "cumulative":
      return m.monthly_spend ?? null;
    case "balance":
      return m.balance_usd ?? null;
    case "credits":
      return m.credits_remaining ?? null;
    case "requests":
      return m.request_count ?? null;
    default:
      return null;
  }
};

const PRIMARY_LABEL: Record<MetricKind, string> = {
  cumulative: "This month",
  balance: "Balance",
  credits: "Credits left",
  requests: "Requests",
  none: "No data yet",
};

export const CHART_LABEL: Record<MetricKind, string> = {
  cumulative: "Spend over time",
  balance: "Balance over time",
  credits: "Credits over time",
  requests: "Requests over time",
  none: "Over time",
};

export interface PrimaryMetric {
  value: number | null;
  label: string;
  isMoney: boolean;
}

export const primaryMetric = (m: TrackerMetrics): PrimaryMetric => {
  const kind = metricKind(m);
  return {
    value: metricValueFor(kind, m),
    label: PRIMARY_LABEL[kind],
    isMoney: isMoneyKind(kind),
  };
};

export interface MetricBox {
  label: string;
  value: number | null;
  isMoney: boolean;
}

export const headlineMetrics = (m: TrackerMetrics): MetricBox[] => {
  const kind = metricKind(m);
  if (kind === "cumulative")
    return [
      { label: "This month", value: m.monthly_spend ?? null, isMoney: true },
      { label: "Past 7 days", value: m.weekly_spend ?? null, isMoney: true },
    ];
  if (kind === "balance")
    return [{ label: "Balance", value: m.balance_usd ?? null, isMoney: true }];
  if (kind === "credits")
    return [
      {
        label: "Credits remaining",
        value: m.credits_remaining ?? null,
        isMoney: false,
      },
    ];
  if (kind === "requests")
    return [
      { label: "Requests", value: m.request_count ?? null, isMoney: false },
    ];
  return [{ label: "No data yet", value: null, isMoney: true }];
};

export const formatSpend = (amount: number, isMoney: boolean): string =>
  isMoney ? formatMoney(amount) : formatNumber(amount);

export const formatMetric = (
  value: number | null,
  isMoney: boolean,
): string => (value == null ? "—" : isMoney ? formatMoney(value) : formatNumber(value));
