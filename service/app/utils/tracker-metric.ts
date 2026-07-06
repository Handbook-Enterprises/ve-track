import { formatMoney, formatNumber } from "./format";
import type { Tracker, TrackerMetrics } from "~/types/tracker.types";

export const detectOrgClashes = (
  accounts: Array<Pick<Tracker, "id" | "total_usage_usd">>,
): Set<string> => {
  const byTotal = new Map<number, string[]>();
  for (const a of accounts) {
    if (a.total_usage_usd == null || a.total_usage_usd <= 0) continue;
    const list = byTotal.get(a.total_usage_usd) ?? [];
    list.push(a.id);
    byTotal.set(a.total_usage_usd, list);
  }
  const clashed = new Set<string>();
  for (const ids of byTotal.values()) {
    if (ids.length > 1) for (const id of ids) clashed.add(id);
  }
  return clashed;
};

export const WINDOW_LABEL = "Last 28 days";

export type MetricKind =
  | "cumulative"
  | "usage"
  | "credits_used"
  | "balance"
  | "credits"
  | "requests"
  | "none";

export const metricKind = (m: TrackerMetrics): MetricKind =>
  m.monthly_spend != null
    ? "cumulative"
    : m.total_usage_usd != null
      ? "usage"
      : m.total_usage_credits != null
        ? "credits_used"
        : m.balance_usd != null
          ? "balance"
          : m.credits_remaining != null
            ? "credits"
            : m.request_count != null
              ? "requests"
              : "none";

export const isMoneyKind = (kind: MetricKind): boolean =>
  kind === "cumulative" || kind === "usage" || kind === "balance";

export const metricValueFor = (
  kind: MetricKind,
  m: TrackerMetrics,
): number | null => {
  switch (kind) {
    case "cumulative":
      return m.monthly_spend ?? null;
    case "usage":
      return m.total_usage_usd ?? null;
    case "credits_used":
      return m.total_usage_credits ?? null;
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
  usage: "Total Spend",
  credits_used: "Total Credits",
  balance: "Balance",
  credits: "Credits left",
  requests: "Requests",
  none: "No data yet",
};

export const CHART_LABEL: Record<MetricKind, string> = {
  cumulative: "Spend over time",
  usage: "Spend per day",
  credits_used: "Credits per day",
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
  if (kind === "usage")
    return [
      { label: "Total Spend", value: m.total_usage_usd ?? null, isMoney: true },
    ];
  if (kind === "credits_used")
    return [
      {
        label: "Total Credits",
        value: m.total_usage_credits ?? null,
        isMoney: false,
      },
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
