import type { LucideIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import DeltaBadge from "./delta-badge";
import type { UsageDelta } from "~/types/usage.types";

interface Props {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  accent?: boolean;
  delta?: UsageDelta;
  deltaInverted?: boolean;
  className?: string;
  marker?: string;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  description,
  accent = false,
  delta,
  deltaInverted,
  className,
  marker,
}: Props) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden border bg-card p-6 transition-colors duration-300",
        accent
          ? "border-primary/30 hover:border-primary/60"
          : "hover:border-foreground/15",
        className,
      )}
    >
      {accent && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.05] to-transparent" />
      )}
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {marker ? (
              <span className="font-mono text-[10px] font-medium text-muted-foreground tabular-nums">
                {marker}
              </span>
            ) : null}
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {title}
            </p>
          </div>
          {Icon ? (
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center border transition-colors duration-300",
                accent
                  ? "border-primary/30 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                  : "border-foreground/10 text-muted-foreground group-hover:border-foreground/20",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>
          ) : null}
        </div>
        <p className="mt-5 font-mono text-[2.1rem] font-medium leading-none tracking-tight tabular-nums">
          {value}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {delta ? <DeltaBadge delta={delta} inverted={deltaInverted} /> : null}
          {description ? (
            <p className="text-[12px] leading-snug text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
