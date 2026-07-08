export function formatMoney(n: number | null | undefined): string {
  const num = Number(n ?? 0);
  if (!Number.isFinite(num) || num === 0) return "$0.00";
  if (num > 0 && num < 0.005) return "<$0.01";
  if (num < 0 && num > -0.005) return ">-$0.01";
  return `$${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPreciseMoney(
  n: number | null | undefined,
  maxFractionDigits = 4,
): string {
  const num = Number(n ?? 0);
  if (!Number.isFinite(num)) return "$0.00";
  return `$${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxFractionDigits,
  })}`;
}

export function formatShare(value: number, total: number): string {
  if (total <= 0) return "—";
  const pct = (value / total) * 100;
  if (pct >= 10) return `${Math.round(pct)}%`;
  if (pct >= 1) return `${pct.toFixed(1)}%`;
  return "<1%";
}

export function formatNumber(n: number | null | undefined): string {
  const num = Number(n ?? 0);
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString();
}

export function formatRelativeTime(timestamp: number | null | undefined): string {
  if (!timestamp) return "—";
  const diff = Date.now() - timestamp;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
