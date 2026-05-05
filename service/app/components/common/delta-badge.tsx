import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "~/lib/utils";
import type { UsageDelta } from "~/types/usage.types";

interface Props {
  delta?: UsageDelta;
  inverted?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export default function DeltaBadge({
  delta,
  inverted = false,
  size = "sm",
  className,
}: Props) {
  if (!delta) return null;

  const { direction, pctChange, previousCost } = delta;

  if (previousCost === 0 && pctChange === null) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 border border-dashed border-foreground/20 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground",
          className,
        )}
      >
        new
      </span>
    );
  }

  if (direction === "flat" || pctChange === null) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 border border-foreground/15 px-1.5 py-0.5 font-mono uppercase tracking-wide text-muted-foreground",
          size === "md" ? "text-[11px]" : "text-[10px]",
          className,
        )}
      >
        <ArrowRight className="h-3 w-3" />
        flat
      </span>
    );
  }

  const isAlarming = inverted ? direction === "down" : direction === "up";
  const Icon = direction === "up" ? ArrowUpRight : ArrowDownRight;
  const palette = isAlarming
    ? "border-destructive/40 bg-destructive/5 text-destructive"
    : "border-[color:var(--color-positive)]/45 bg-[color:var(--color-positive)]/8 text-[color:var(--color-positive)]";
  const sign = direction === "up" ? "+" : "";
  const pctDisplay = `${sign}${pctChange.toFixed(pctChange % 1 === 0 ? 0 : 1)}%`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono tabular-nums",
        palette,
        size === "md" ? "text-[11.5px]" : "text-[10.5px]",
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {pctDisplay}
    </span>
  );
}
