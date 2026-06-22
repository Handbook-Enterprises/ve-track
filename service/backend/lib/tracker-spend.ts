export type MetricKind =
  | "cumulative"
  | "balance"
  | "credits"
  | "requests"
  | "none";

export interface MetricFields {
  monthly_spend?: number | null;
  weekly_spend?: number | null;
  balance_usd?: number | null;
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
    : m.balance_usd != null
      ? "balance"
      : m.credits_remaining != null
        ? "credits"
        : m.request_count != null
          ? "requests"
          : "none";

export const isMoneyKind = (kind: MetricKind): boolean =>
  kind === "cumulative" || kind === "balance";

export const valueFor = (kind: MetricKind, m: MetricFields): number | null => {
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

/**
 * Turn a chronologically ordered series of point-in-time metric snapshots into
 * per-day spend by differencing consecutive snapshots:
 * - cumulative (month-to-date spend): forward diff; a drop means a month reset,
 *   so that day's spend is the new running value.
 * - balance / credits (counts down as you spend): backward diff (prev - current),
 *   clamped at 0 so top-ups never read as negative spend.
 */
export const deriveDailySpend = (
  snapshots: Array<{ day: string } & MetricFields>,
  kind: MetricKind,
): DailySpend[] => {
  const out: DailySpend[] = [];
  let prev: number | null = null;
  for (const s of snapshots) {
    const v = valueFor(kind, s);
    if (v == null) continue;
    let spend = 0;
    if (prev != null) {
      if (kind === "cumulative") spend = v >= prev ? v - prev : v;
      else if (kind === "balance" || kind === "credits") spend = prev - v;
      else spend = v - prev;
    }
    out.push({ day: s.day, value: Math.max(0, spend) });
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
