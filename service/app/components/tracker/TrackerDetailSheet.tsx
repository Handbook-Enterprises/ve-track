import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { useAuthContext } from "~/context/AuthContext";
import { TrackerService } from "~/services/tracker.service";
import { LoadingElement } from "~/components/elements";
import DateRangePicker from "~/components/common/date-range-picker";
import SpendAreaChart from "~/components/common/spend-area-chart";
import { cn } from "~/lib/utils";
import { formatMoney, formatNumber } from "~/utils/format";
import { providerLabel } from "~/utils/providers";
import type { DateRange, RangePresetId } from "~/utils/date-range";
import type { Tracker, TrackerCostDetail } from "~/types/tracker.types";

interface Props {
  account: Tracker | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRange: DateRange;
  initialPresetId: RangePresetId | null;
}

function HeadlineStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={cn("bg-card p-3", accent && "bg-primary/[0.06]")}>
      <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-[16px] font-bold leading-none tabular-nums",
          accent && "text-primary",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export default function TrackerDetailSheet({
  account,
  open,
  onOpenChange,
  initialRange,
  initialPresetId,
}: Props) {
  const { authFetch } = useAuthContext();
  const [range, setRange] = useState<DateRange>(initialRange);
  const [activePresetId, setActivePresetId] = useState<RangePresetId | null>(
    initialPresetId,
  );
  const [detail, setDetail] = useState<TrackerCostDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRange(initialRange);
      setActivePresetId(initialPresetId);
    }
  }, [open, account?.id]);

  useEffect(() => {
    if (!open || !account) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    console.log("[ve-track][tracker-detail] loading costs", {
      trackerId: account.id,
      provider: account.provider,
      from: range.from,
      to: range.to,
    });
    TrackerService.getCosts(authFetch, account.id, {
      from: range.from,
      to: range.to,
    })
      .then((data) => {
        console.log("[ve-track][tracker-detail] loaded", {
          trackerId: account.id,
          points: data.detail.series.length,
          totals: data.detail.totals,
        });
        if (!cancelled) setDetail(data.detail);
      })
      .catch((err) => {
        console.error("[ve-track][tracker-detail] load failed", err);
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, account?.id, range.from, range.to, authFetch]);

  const cost = detail?.totals.cost_usd ?? 0;
  const calls = detail?.totals.requests ?? 0;
  const avg = calls > 0 ? cost / calls : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        {account ? (
          <>
            <SheetHeader className="gap-4 border-b pb-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                    Tracked account
                  </p>
                  <SheetTitle className="text-[24px] font-bold leading-tight tracking-tight">
                    {providerLabel(account.provider)}
                  </SheetTitle>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {account.account_ref ?? `Account ····${account.key_last4}`}
                  </p>
                </div>
                <DateRangePicker
                  value={range}
                  activePresetId={activePresetId}
                  onChange={(next, presetId) => {
                    setRange(next);
                    setActivePresetId(presetId);
                  }}
                />
              </div>

              <div className="grid grid-cols-3 gap-px bg-border">
                <HeadlineStat label="Spend" value={formatMoney(cost)} accent />
                <HeadlineStat
                  label="Avg/call"
                  value={calls > 0 ? formatMoney(avg) : "—"}
                />
                <HeadlineStat
                  label="Calls"
                  value={calls > 0 ? formatNumber(calls) : "—"}
                />
              </div>
            </SheetHeader>

            {loading && !detail ? (
              <div className="flex min-h-[40vh] items-center justify-center">
                {error ? (
                  <p className="max-w-xs text-center text-[12.5px] text-destructive">
                    {error}
                  </p>
                ) : (
                  <LoadingElement size={20} />
                )}
              </div>
            ) : detail ? (
              <div className="space-y-6 pt-5">
                <section>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Spend over time · {range.label}
                  </p>
                  <SpendAreaChart
                    data={detail.series}
                    from={range.from}
                    to={range.to}
                    emptyHint={null}
                  />
                </section>
              </div>
            ) : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
