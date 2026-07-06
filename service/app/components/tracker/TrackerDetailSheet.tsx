import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { useAuthContext } from "~/context/AuthContext";
import { TrackerService } from "~/services/tracker.service";
import { Skeleton } from "~/components/ui/skeleton";
import { ChartSkeleton } from "~/components/common/entity-detail-skeleton";
import DateRangePicker from "~/components/common/date-range-picker";
import SpendAreaChart from "~/components/common/spend-area-chart";
import { cn } from "~/lib/utils";
import { providerLabel } from "~/utils/providers";
import {
  CHART_LABEL,
  formatMetric,
  isMoneyKind,
  metricKind,
} from "~/utils/tracker-metric";
import { isLifetimePreset } from "~/utils/date-range";
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
          metrics: data.detail.metrics,
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

  const kind = account ? metricKind(account) : "none";
  const isLifetime = isLifetimePreset(activePresetId);
  const periodTotal = detail
    ? isLifetime
      ? detail.lifetime
      : detail.windowTotal
    : null;
  const avgPerDay =
    detail && detail.activeDays > 0
      ? (periodTotal ?? 0) / detail.activeDays
      : null;
  const chartData = (detail?.series ?? []).map((p) => ({
    day: p.day,
    cost_usd: p.value,
    credits: 0,
    requests: 0,
  }));

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
            </SheetHeader>

            {error && !detail ? (
              <div className="flex min-h-[40vh] items-center justify-center px-4">
                <p className="max-w-xs text-center text-[12.5px] text-destructive">
                  {error}
                </p>
              </div>
            ) : loading ? (
              <div className="space-y-6 px-4 pt-5 pb-6">
                <section>
                  <Skeleton className="mb-2.5 h-2.5 w-24" />
                  <div className="grid grid-cols-2 gap-px bg-border">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="bg-card p-3">
                        <Skeleton className="h-2.5 w-20" />
                        <Skeleton className="mt-2 h-4 w-20" />
                      </div>
                    ))}
                  </div>
                </section>
                <section>
                  <Skeleton className="mb-2.5 h-2.5 w-40" />
                  <ChartSkeleton />
                </section>
              </div>
            ) : detail ? (
              <div className="space-y-6 px-4 pt-5 pb-6">
                <section>
                  <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {isLifetime ? "Lifetime" : range.label}
                  </p>
                  <div className="grid grid-cols-2 gap-px bg-border">
                    <HeadlineStat
                      label={isLifetime ? "Lifetime spend" : "Total spend"}
                      value={
                        periodTotal != null
                          ? formatMetric(periodTotal, detail.isMoney)
                          : "—"
                      }
                      accent
                    />
                    <HeadlineStat
                      label="Avg / day"
                      value={
                        avgPerDay != null
                          ? formatMetric(avgPerDay, detail.isMoney)
                          : "—"
                      }
                    />
                  </div>
                </section>

                <section>
                  <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {CHART_LABEL[kind]} · {range.label}
                  </p>
                  <SpendAreaChart
                    data={chartData}
                    from={range.from}
                    to={range.to}
                    isMoney={isMoneyKind(kind)}
                    emptyTitle="No Spend Yet"
                    emptyHint="Your daily spend will appear here and record here over time."
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
