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
import { LoadingElement } from "~/components/elements";
import DateRangePicker from "./date-range-picker";
import SpendAreaChart from "./spend-area-chart";
import DimensionList from "./dimension-list";
import { cn } from "~/lib/utils";
import { formatMoney, formatNumber } from "~/utils/format";
import { providerLabel } from "~/utils/providers";
import type { DateRange, RangePresetId } from "~/utils/date-range";
import type { UsageGroup, UsageOverview } from "~/types/usage.types";

interface Props {
  provider: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRange: DateRange;
  initialPresetId: RangePresetId | null;
}

const TABS: Array<{
  id: string;
  label: string;
  pick: (o: UsageOverview) => UsageGroup[];
  variant?: "plain" | "identity";
  emptyLabel?: string;
  fallbackLabel?: string;
}> = [
  { id: "models", label: "Models", pick: (o) => o.byModel, emptyLabel: "Unknown" },
  { id: "actions", label: "Actions", pick: (o) => o.byAction, emptyLabel: "Untagged" },
  { id: "apps", label: "Apps", pick: (o) => o.byApp, emptyLabel: "Unattributed" },
  {
    id: "people",
    label: "People",
    pick: (o) => o.byUser,
    variant: "identity",
    fallbackLabel: "Anonymous",
  },
  {
    id: "orgs",
    label: "Organizations",
    pick: (o) => o.byOrg,
    variant: "identity",
    fallbackLabel: "Personal / no org",
  },
];

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

export default function ProviderDetailSheet({
  provider,
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
  const [overview, setOverview] = useState<UsageOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRange(initialRange);
      setActivePresetId(initialPresetId);
    }
  }, [open, provider]);

  useEffect(() => {
    if (!open || !provider) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    UsageService.getOverview(authFetch, {
      provider,
      from: range.from,
      to: range.to,
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
  }, [open, provider, range.from, range.to, authFetch]);

  const totals = overview?.totals;
  const cost = totals?.cost_usd ?? 0;
  const calls = totals?.requests ?? 0;
  const tokens = (totals?.prompt_tokens ?? 0) + (totals?.completion_tokens ?? 0);
  const avg = calls > 0 ? cost / calls : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="gap-4 border-b pb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                Provider
              </p>
              <SheetTitle className="text-[24px] font-bold leading-tight tracking-tight">
                {providerLabel(provider)}
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

          <div className="grid grid-cols-4 gap-px bg-border">
            <HeadlineStat label="Spend" value={formatMoney(cost)} accent />
            <HeadlineStat label="Avg/call" value={formatMoney(avg)} />
            <HeadlineStat label="Calls" value={formatNumber(calls)} />
            <HeadlineStat
              label="Tokens"
              value={tokens > 0 ? formatNumber(tokens) : "—"}
            />
          </div>
        </SheetHeader>

        {loading && !overview ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            {error ? (
              <p className="max-w-xs text-center text-[12.5px] text-destructive">
                {error}
              </p>
            ) : (
              <LoadingElement size={20} />
            )}
          </div>
        ) : overview ? (
          <div className="space-y-6 pt-5">
            <section>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Spend over time · {range.label}
              </p>
              <SpendAreaChart
                data={overview.series}
                from={range.from}
                to={range.to}
              />
            </section>

            <Tabs defaultValue="models">
              <TabsList className="w-full">
                {TABS.map((t) => (
                  <TabsTrigger key={t.id} value={t.id} className="flex-1">
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {TABS.map((t) => (
                <TabsContent key={t.id} value={t.id} className="mt-1">
                  <DimensionList
                    groups={t.pick(overview)}
                    totalCost={cost}
                    variant={t.variant}
                    emptyLabel={t.emptyLabel}
                    fallbackLabel={t.fallbackLabel}
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
