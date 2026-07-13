import { ArrowUpRight } from "lucide-react";
import { formatMoney, formatNumber } from "~/utils/format";
import type { UsageGroup } from "~/types/usage.types";

interface Props {
  title: string;
  description: string;
  group: UsageGroup;
  onSelect: (group: UsageGroup) => void;
}

function StripStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <span className="mt-0.5 font-mono text-[14px] font-semibold tabular-nums">
        {value}
      </span>
    </div>
  );
}

export default function NullSegmentStrip({
  title,
  description,
  group,
  onSelect,
}: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(group)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(group);
        }
      }}
      className="group flex cursor-pointer flex-wrap items-center gap-x-8 gap-y-3 border border-dashed border-foreground/25 bg-card px-5 py-4 transition-colors hover:border-primary/50 hover:bg-primary/[0.05]"
    >
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
          <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
        </p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-8">
        <StripStat label="Spend" value={formatMoney(group.cost_usd)} />
        <StripStat label="Calls" value={formatNumber(group.requests)} />
        {group.credits > 0 ? (
          <StripStat label="Credits" value={formatNumber(group.credits)} />
        ) : null}
      </div>
    </div>
  );
}
