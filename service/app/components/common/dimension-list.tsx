import IdentityCell from "./identity-cell";
import { cn } from "~/lib/utils";
import { formatMoney, formatNumber } from "~/utils/format";
import type { UsageGroup } from "~/types/usage.types";

interface Props {
  groups: UsageGroup[];
  totalCost: number;
  variant?: "plain" | "identity";
  emptyLabel?: string;
  fallbackLabel?: string;
  limit?: number;
  onSelect?: (group: UsageGroup) => void;
}

const shareLabel = (cost: number, total: number): string => {
  if (total <= 0) return "—";
  const pct = (cost / total) * 100;
  if (pct >= 10) return `${Math.round(pct)}%`;
  if (pct >= 1) return `${pct.toFixed(1)}%`;
  return "<1%";
};

export default function DimensionList({
  groups,
  totalCost,
  variant = "plain",
  emptyLabel = "Untagged",
  fallbackLabel = "Unknown",
  limit = 12,
  onSelect,
}: Props) {
  const rows = groups
    .filter((g) => g.cost_usd > 0 || g.requests > 0)
    .slice(0, limit);

  if (rows.length === 0) {
    return (
      <p className="px-1 py-8 text-center text-[12.5px] text-muted-foreground">
        No data in this period.
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {rows.map((g, i) => {
        const pct = totalCost > 0 ? (g.cost_usd / totalCost) * 100 : 0;
        const isTop = i === 0;
        const clickable = onSelect != null && g.key != null;
        return (
          <li
            key={`${g.key ?? "null"}-${i}`}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={clickable ? () => onSelect(g) : undefined}
            onKeyDown={
              clickable
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(g);
                    }
                  }
                : undefined
            }
            className={cn(
              "flex items-center gap-3 py-3",
              clickable &&
                "-mx-2 cursor-pointer rounded-none px-2 transition-colors hover:bg-primary/[0.05]",
            )}
          >
            <span
              className={cn(
                "w-5 shrink-0 text-center font-mono text-[12px] tabular-nums",
                isTop ? "text-primary" : "text-muted-foreground",
              )}
            >
              {i + 1}
            </span>

            <div className="min-w-0 flex-1">
              {variant === "identity" ? (
                <IdentityCell
                  name={g.name}
                  secondary={g.secondary}
                  fallbackId={g.key}
                  fallbackLabel={fallbackLabel}
                  imageUrl={g.imageUrl ?? null}
                  accent={isTop}
                />
              ) : (
                <p
                  className={cn(
                    "truncate text-[13.5px]",
                    !g.key && "italic text-muted-foreground",
                    isTop ? "font-semibold" : "font-medium",
                  )}
                >
                  {g.key || emptyLabel}
                </p>
              )}
              <div className="mt-1.5 h-1 w-full overflow-hidden bg-muted">
                <div
                  className={cn("h-full", isTop ? "bg-primary" : "bg-foreground/25")}
                  style={{ width: `${Math.max(pct, 1.5)}%` }}
                />
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end">
              <span className="text-[13.5px] font-semibold tabular-nums">
                {formatMoney(g.cost_usd)}
              </span>
              <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">
                {formatNumber(g.requests)} calls · {shareLabel(g.cost_usd, totalCost)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
