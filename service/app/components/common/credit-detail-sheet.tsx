import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useAuthContext } from "~/context/AuthContext";
import { CreditService } from "~/services/credit.service";
import EntityDetailSkeleton, {
  DetailStatsSkeleton,
} from "./entity-detail-skeleton";
import DateRangePicker from "./date-range-picker";
import SpendAreaChart from "./spend-area-chart";
import { cn } from "~/lib/utils";
import { formatMoney, formatNumber } from "~/utils/format";
import { isLifetimePreset } from "~/utils/date-range";
import type { DateRange, RangePresetId } from "~/utils/date-range";
import type {
  CreditDetail,
  CreditDimension,
  CreditGroup,
  CreditQueryFilters,
} from "~/types/credit.types";

interface Props {
  dimension: CreditDimension;
  entity: CreditGroup | null;
  emptyLabel: string;
  nounSingular: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRange: DateRange;
  initialPresetId: RangePresetId | null;
}

const FILTER_KEY: Record<CreditDimension, keyof CreditQueryFilters> = {
  app: "app",
  action: "action",
  org: "clerk_org_id",
  user: "clerk_user_id",
};

const BREAKDOWNS: Array<{
  id: CreditDimension;
  label: string;
  pick: (d: CreditDetail) => CreditGroup[];
  emptyLabel: string;
}> = [
  { id: "action", label: "Actions", pick: (d) => d.byAction, emptyLabel: "Untagged" },
  { id: "org", label: "Organizations", pick: (d) => d.byOrg, emptyLabel: "Personal / no org" },
  { id: "user", label: "People", pick: (d) => d.byUser, emptyLabel: "Anonymous" },
];

function Stat({
  label,
  value,
  accent,
  tone,
}: {
  label: string;
  value: string;
  accent?: boolean;
  tone?: string;
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
          tone,
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Breakdown({
  rows,
  emptyLabel,
}: {
  rows: CreditGroup[];
  emptyLabel: string;
}) {
  const visible = rows.filter((g) => g.credits > 0 || g.charges > 0).slice(0, 12);
  const top = visible[0]?.revenue_usd ?? 0;
  if (visible.length === 0) {
    return (
      <p className="px-1 py-8 text-center text-[12.5px] text-muted-foreground">
        No data in this period.
      </p>
    );
  }
  return (
    <ul className="divide-y">
      {visible.map((g, i) => {
        const pct = top > 0 ? (g.revenue_usd / top) * 100 : 0;
        const isTop = i === 0;
        return (
          <li key={`${g.key ?? "null"}-${i}`} className="flex items-center gap-3 py-3">
            <span
              className={cn(
                "w-5 shrink-0 text-center font-mono text-[12px] tabular-nums",
                isTop ? "text-primary" : "text-muted-foreground",
              )}
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "truncate text-[13.5px]",
                  !g.key && "italic text-muted-foreground",
                  isTop ? "font-semibold" : "font-medium",
                )}
              >
                {g.key || emptyLabel}
              </p>
              <div className="mt-1.5 h-1 w-full overflow-hidden bg-muted">
                <div
                  className={cn("h-full", isTop ? "bg-primary" : "bg-foreground/25")}
                  style={{ width: `${Math.max(pct, 1.5)}%` }}
                />
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end">
              <span className="text-[13.5px] font-semibold tabular-nums">
                {formatMoney(g.revenue_usd)}
              </span>
              <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">
                {formatNumber(g.credits)} credits · {formatNumber(g.charges)} charges
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function CreditDetailSheet({
  dimension,
  entity,
  emptyLabel,
  nounSingular,
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
  const [detail, setDetail] = useState<CreditDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRange(initialRange);
      setActivePresetId(initialPresetId);
    }
  }, [open, entity?.key, dimension]);

  useEffect(() => {
    if (!open || !entity?.key) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    CreditService.getDetail(authFetch, {
      [FILTER_KEY[dimension]]: entity.key,
      from: range.from,
      to: range.to,
      lifetime: isLifetimePreset(activePresetId),
    })
      .then((data) => {
        if (!cancelled) setDetail(data.detail);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, entity?.key, dimension, range.from, range.to, activePresetId, authFetch]);

  const totals = detail?.totals;
  const marginTone =
    (totals?.margin_usd ?? 0) > 0
      ? "text-[color:var(--color-positive)]"
      : (totals?.margin_usd ?? 0) < 0
        ? "text-destructive"
        : undefined;
  const title = entity?.key || emptyLabel;
  const tabs = useMemo(
    () => BREAKDOWNS.filter((b) => b.id !== dimension),
    [dimension],
  );
  const revenueSeries = useMemo(
    () =>
      (detail?.series ?? []).map((s) => ({
        day: s.day,
        cost_usd: s.revenue_usd,
        requests: s.credits,
      })),
    [detail],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="gap-4 border-b pb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                {nounSingular.replace(/^./, (c) => c.toUpperCase())}
              </p>
              <SheetTitle className="text-[24px] font-bold leading-tight tracking-tight">
                {title}
              </SheetTitle>
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

          {loading ? (
            <DetailStatsSkeleton />
          ) : (
            <div className="grid grid-cols-4 gap-px bg-border">
              <Stat label="Revenue" value={formatMoney(totals?.revenue_usd ?? 0)} accent />
              <Stat label="Credits" value={formatNumber(totals?.credits ?? 0)} />
              <Stat label="Cost" value={formatMoney(totals?.cost_usd ?? 0)} />
              <Stat
                label="Margin"
                value={formatMoney(totals?.margin_usd ?? 0)}
                tone={marginTone}
              />
            </div>
          )}
        </SheetHeader>

        {error && !detail ? (
          <div className="flex min-h-[40vh] items-center justify-center px-4">
            <p className="max-w-xs text-center text-[12.5px] text-destructive">
              {error}
            </p>
          </div>
        ) : loading ? (
          <EntityDetailSkeleton tabs={tabs.length} />
        ) : detail ? (
          <div className="space-y-6 px-4 pt-5 pb-6">
            <section>
              <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Revenue over time · {range.label}
              </p>
              <SpendAreaChart
                data={revenueSeries}
                from={range.from}
                to={range.to}
                emptyTitle="No credit revenue yet"
                emptyHint="Charges show up here as apps send credit data."
              />
            </section>

            <Tabs defaultValue={tabs[0]?.id}>
              <TabsList className="w-full">
                {tabs.map((t) => (
                  <TabsTrigger key={t.id} value={t.id} className="flex-1">
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {tabs.map((t) => (
                <TabsContent key={t.id} value={t.id} className="mt-1">
                  <Breakdown rows={t.pick(detail)} emptyLabel={t.emptyLabel} />
                </TabsContent>
              ))}
            </Tabs>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
