import { cn } from "~/lib/utils";
import { formatMoney } from "~/utils/format";
import type { UsageGroup } from "~/types/usage.types";

interface Props {
  rank: number;
  group: UsageGroup;
  totalCost: number;
  emptyKeyLabel?: string;
}

export default function UsageRow({
  rank,
  group,
  totalCost,
  emptyKeyLabel = "—",
}: Props) {
  const percent =
    totalCost > 0 ? Math.min(100, (group.cost_usd / totalCost) * 100) : 0;

  return (
    <div className="grid grid-cols-[3rem_minmax(0,1fr)_8rem_8rem_8rem] items-center gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-muted/30">
      <span className="text-[11px] tabular-nums text-muted-foreground">
        /{String(rank).padStart(2, "0")}
      </span>

      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {group.key || emptyKeyLabel}
        </p>
        <div className="mt-1.5 h-1 w-full overflow-hidden bg-muted">
          <div
            className={cn(
              "h-full bg-foreground/70",
              rank === 1 && "bg-primary",
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <span className="text-right text-sm font-medium tabular-nums">
        {formatMoney(group.cost_usd)}
      </span>
      <span className="text-right text-xs tabular-nums text-muted-foreground">
        {group.requests.toLocaleString()}
      </span>
      <span className="text-right text-xs tabular-nums text-muted-foreground">
        {(group.prompt_tokens + group.completion_tokens).toLocaleString()}
      </span>
    </div>
  );
}
