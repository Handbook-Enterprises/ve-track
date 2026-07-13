import { cn } from "~/lib/utils";
import { formatMoney } from "~/utils/format";
import type { UsageGroup } from "~/types/usage.types";

interface Props {
  providers: UsageGroup[];
  totalCost: number;
}

export default function ProviderRanking({ providers, totalCost }: Props) {
  const top = providers.slice(0, 5);

  if (top.length === 0) {
    return (
      <div className="flex h-[12rem] items-center justify-center text-[13px] text-muted-foreground">
        No provider spend in this window yet.
      </div>
    );
  }

  return (
    <ul className="divide-y">
      {top.map((provider, index) => {
        const share = totalCost > 0 ? (provider.cost_usd / totalCost) * 100 : 0;
        const isTop = index === 0;
        return (
          <li
            key={`${provider.key ?? "unknown"}-${index}`}
            className="relative flex items-center gap-4 px-5 py-4"
          >
            <span
              className={cn(
                "w-5 shrink-0 font-mono text-[13px] tabular-nums",
                isTop ? "text-primary" : "text-muted-foreground",
              )}
            >
              {index + 1}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-[14px] font-semibold capitalize">
                  {provider.key || "Unknown"}
                </p>
                <span className="shrink-0 font-mono text-[14px] font-medium tabular-nums">
                  {formatMoney(provider.cost_usd)}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-3">
                <div className="h-1 flex-1 overflow-hidden bg-muted">
                  <div
                    className={cn(
                      "h-full transition-all",
                      isTop ? "bg-primary" : "bg-foreground/30",
                    )}
                    style={{ width: `${Math.max(share, 1.5)}%` }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                  {share >= 1 ? `${Math.round(share)}%` : "<1%"}
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
