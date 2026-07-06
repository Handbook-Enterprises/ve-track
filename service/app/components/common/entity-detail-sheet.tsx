import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useAuthContext } from "~/context/AuthContext";
import { UsageService } from "~/services/usage.service";
import EntityDetailSkeleton, {
  DetailStatsSkeleton,
} from "./entity-detail-skeleton";
import DateRangePicker from "./date-range-picker";
import SpendAreaChart from "./spend-area-chart";
import DimensionList from "./dimension-list";
import ProviderTrackersTab from "~/components/tracker/ProviderTrackersTab";
import { cn } from "~/lib/utils";
import { formatMoney, formatNumber } from "~/utils/format";
import {
  DIMENSIONS,
  isEntityId,
  type EntityConfig,
  type EntityId,
} from "~/utils/entity-dimensions";
import { isLifetimePreset } from "~/utils/date-range";
import type { DateRange, RangePresetId } from "~/utils/date-range";
import type { UsageGroup, UsageOverview } from "~/types/usage.types";

interface Props {
  config: EntityConfig;
  entity: UsageGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRange: DateRange;
  initialPresetId: RangePresetId | null;
  onDrill?: (entityId: EntityId, group: UsageGroup) => void;
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

export default function EntityDetailSheet({
  config,
  entity,
  open,
  onOpenChange,
  initialRange,
  initialPresetId,
  onDrill,
}: Props) {
  const { authFetch } = useAuthContext();
  const [range, setRange] = useState<DateRange>(initialRange);
  const [activePresetId, setActivePresetId] = useState<RangePresetId | null>(
    initialPresetId,
  );
  const [overview, setOverview] = useState<UsageOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRange(initialRange);
      setActivePresetId(initialPresetId);
    }
  }, [open, entity?.key, config.id]);

  useEffect(() => {
    if (!open || !entity?.key) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    UsageService.getOverview(authFetch, {
      [config.filterKey]: entity.key,
      from: range.from,
      to: range.to,
      lifetime: isLifetimePreset(activePresetId),
    })
      .then((data) => {
        if (!cancelled) setOverview(data.overview);
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
  }, [
    open,
    entity?.key,
    config.filterKey,
    range.from,
    range.to,
    activePresetId,
    authFetch,
  ]);

  const totals = overview?.totals;
  const cost = totals?.cost_usd ?? 0;
  const calls = totals?.requests ?? 0;
  const credits = totals?.credits ?? 0;
  const avg = calls > 0 ? cost / calls : 0;
  const title = entity ? config.label(entity) : "";
  const tabs = config.related.map((id) => DIMENSIONS[id]);
  const showTrackers = config.id === "provider" && Boolean(entity?.key);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="gap-4 border-b pb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                {config.noun.replace(/^./, (c) => c.toUpperCase())}
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
            <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
              <HeadlineStat label="Spend" value={formatMoney(cost)} accent />
              <HeadlineStat
                label="Avg/call"
                value={calls > 0 ? formatMoney(avg) : "—"}
              />
              <HeadlineStat
                label="Calls"
                value={calls > 0 ? formatNumber(calls) : "—"}
              />
              <HeadlineStat
                label="Credits"
                value={credits > 0 ? formatNumber(credits) : "—"}
              />
            </div>
          )}
        </SheetHeader>

        {error && !overview ? (
          <div className="flex min-h-[40vh] items-center justify-center px-4">
            <p className="max-w-xs text-center text-[12.5px] text-destructive">
              {error}
            </p>
          </div>
        ) : loading ? (
          <EntityDetailSkeleton tabs={tabs.length + (showTrackers ? 1 : 0)} />
        ) : overview ? (
          <div className="space-y-6 px-4 pt-5 pb-6">
            <section>
              <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Spend over time · {range.label}
              </p>
              <SpendAreaChart
                data={overview.series}
                from={range.from}
                to={range.to}
              />
            </section>

            <Tabs defaultValue={tabs[0]?.id}>
              <TabsList className="w-full">
                {tabs.map((t) => (
                  <TabsTrigger key={t.id} value={t.id} className="flex-1">
                    {t.tabLabel}
                  </TabsTrigger>
                ))}
                {showTrackers ? (
                  <TabsTrigger value="trackers" className="flex-1">
                    Trackers
                  </TabsTrigger>
                ) : null}
              </TabsList>
              {showTrackers && entity ? (
                <TabsContent value="trackers" className="mt-1">
                  <ProviderTrackersTab
                    providerKey={entity.key ?? ""}
                    range={range}
                    presetId={activePresetId}
                  />
                </TabsContent>
              ) : null}
              {tabs.map((t) => (
                <TabsContent key={t.id} value={t.id} className="mt-1">
                  <DimensionList
                    groups={t.pick(overview)}
                    totalCost={cost}
                    variant={t.variant}
                    emptyLabel={t.emptyLabel}
                    fallbackLabel={t.fallbackLabel}
                    onSelect={
                      onDrill && isEntityId(t.id)
                        ? (group) => onDrill(t.id as EntityId, group)
                        : undefined
                    }
                  />
                </TabsContent>
              ))}
            </Tabs>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
