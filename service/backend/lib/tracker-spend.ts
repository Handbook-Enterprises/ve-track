export type MetricKind =
  | "cumulative"
  | "usage"
  | "credits_used"
  | "balance"
  | "credits"
  | "requests"
  | "none";

export interface MetricFields {
  monthly_spend?: number | null;
  weekly_spend?: number | null;
  balance_usd?: number | null;
  total_usage_usd?: number | null;
  total_usage_credits?: number | null;
  credits_remaining?: number | null;
  request_count?: number | null;
}

export interface DailySpend {
  day: string;
  value: number;
}

export const metricKind = (m: MetricFields): MetricKind =>
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

export const valueFor = (kind: MetricKind, m: MetricFields): number | null => {
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

export const dailyDelta = (
  kind: MetricKind,
  prev: number | null,
  current: number | null,
): number | null => {
  if (prev == null || current == null) return null;
  let spend: number;
  if (kind === "cumulative" || kind === "usage" || kind === "credits_used")
    spend = current >= prev ? current - prev : current;
  else if (kind === "balance" || kind === "credits") spend = prev - current;
  else spend = current - prev;
  return Math.max(0, spend);
};

export const deriveDailySpend = (
  snapshots: Array<{ day: string } & MetricFields>,
  kind: MetricKind,
): DailySpend[] => {
  const out: DailySpend[] = [];
  let prev: number | null = null;
  for (const s of snapshots) {
    const v = valueFor(kind, s);
    if (v == null) continue;
    out.push({ day: s.day, value: dailyDelta(kind, prev, v) ?? 0 });
    prev = v;
  }
  return out;
};

export const windowSum = (
  daily: DailySpend[],
  fromTs: number,
  toTs: number,
): number => {
  let total = 0;
  for (const d of daily) {
    const t = Date.parse(`${d.day}T00:00:00Z`);
    if (t >= fromTs && t <= toTs) total += d.value;
  }
  return Math.round(total * 1_000_000) / 1_000_000;
};
