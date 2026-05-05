export function formatMoney(n: number | null | undefined): string {
  const num = Number(n ?? 0);
  if (!Number.isFinite(num)) return "$0.00";
  if (num === 0) return "$0.00";
  const abs = Math.abs(num);
  let max = 2;
  if (abs < 0.01) max = 6;
  else if (abs < 1) max = 4;
  return `$${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: max,
  })}`;
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
